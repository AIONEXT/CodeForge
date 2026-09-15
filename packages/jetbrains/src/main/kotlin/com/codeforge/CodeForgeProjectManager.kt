package com.codeforge

import com.google.gson.GsonBuilder
import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.StartupActivity
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.UUID
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write
import kotlin.math.floor

class CodeForgeProjectManager(private val project: Project) {

    private val logger = Logger.getInstance(CodeForgeProjectManager::class.java)
    private val gson = GsonBuilder().setPrettyPrinting().create()
    private val lock = ReentrantReadWriteLock()

    private var recordbookPath: Path? = null
    private var activeSessionId: String? = null
    private var sessionStartTime: Long = 0L
    private val records = mutableListOf<JsonObject>()

    val projectRoot: String?
        get() = project.basePath

    val isActive: Boolean
        get() = activeSessionId != null

    fun initialize() {
        val root = project.basePath ?: return
        val cfDir = File(root, ".codeforge")
        if (!cfDir.exists()) cfDir.mkdirs()
        recordbookPath = cfDir.toPath().resolve("recordbook.json")

        if (Files.exists(recordbookPath!!)) {
            loadRecordBook()
        } else {
            createRecordBook(root)
        }
    }

    fun startSession() {
        if (activeSessionId != null) return
        val root = project.basePath ?: return

        activeSessionId = generateId()
        sessionStartTime = System.currentTimeMillis()
        records.clear()

        val session = buildSessionObject()
        appendSessionToRecordBook(session)

        logger.info("CodeForge session started: $activeSessionId")
    }

    fun endSession() {
        val sessionId = activeSessionId ?: return
        val root = project.basePath ?: return

        val session = buildSessionObject().apply {
            addProperty("endedAt", nowISO())
            add("summary", computeSummary())
        }
        updateSessionInRecordBook(sessionId, session)

        logger.info("CodeForge session ended: $sessionId")
        activeSessionId = null
        records.clear()
    }

    fun recordTerminalCommand(
        command: String,
        output: String,
        exitCode: Int,
        duration: Long,
        cwd: String,
        shell: String
    ) {
        val sessionId = activeSessionId ?: return
        val category = categorizeCommand(command)
        val explanation = explainCommand(command)
        val isDestructive = isDestructiveCommand(command)

        val record = JsonObject().apply {
            addProperty("id", generateId())
            addProperty("timestamp", nowISO())
            addProperty("sessionId", sessionId)
            addProperty("type", "terminal_command")
            addProperty("command", command.trim())
            addProperty("output", output)
            addProperty("exitCode", exitCode)
            addProperty("duration", duration)
            addProperty("cwd", cwd)
            addProperty("shell", shell)
            addProperty("category", category)
            addProperty("explanation", explanation)
            addProperty("isDestructive", isDestructive)
        }

        records.add(record)
        appendRecordToRecordBook(record)

        if (exitCode != 0) {
            recordError(command, output, exitCode)
        }

        detectMilestones(command, output, exitCode)
    }

    fun recordError(command: String, error: String, exitCode: Int) {
        val sessionId = activeSessionId ?: return
        val category = classifyError(error)
        val diagnosis = explainError(error, command)
        val suggestedFix = suggestFix(error, command)

        val record = JsonObject().apply {
            addProperty("id", generateId())
            addProperty("timestamp", nowISO())
            addProperty("sessionId", sessionId)
            addProperty("type", "error")
            addProperty("command", command.trim())
            addProperty("error", error)
            addProperty("stderr", error)
            addProperty("exitCode", exitCode)
            addProperty("category", category)
            addProperty("diagnosis", diagnosis)
            addProperty("suggestedFix", suggestedFix)
            addProperty("resolved", false)
        }

        records.add(record)
        appendRecordToRecordBook(record)
    }

    fun recordFileSave(path: String, language: String, sizeBytes: Long) {
        val sessionId = activeSessionId ?: return
        val fileName = path.substringAfterLast(File.separator).substringAfterLast('/')

        val record = JsonObject().apply {
            addProperty("id", generateId())
            addProperty("timestamp", nowISO())
            addProperty("sessionId", sessionId)
            addProperty("type", "file_save")
            addProperty("path", path)
            addProperty("fileName", fileName)
            addProperty("language", language)
            addProperty("sizeBytes", sizeBytes)
        }

        records.add(record)
        appendRecordToRecordBook(record)
    }

    fun recordFileRename(oldPath: String, newPath: String) {
        val sessionId = activeSessionId ?: return
        val oldName = oldPath.substringAfterLast(File.separator).substringAfterLast('/')
        val newName = newPath.substringAfterLast(File.separator).substringAfterLast('/')

        val record = JsonObject().apply {
            addProperty("id", generateId())
            addProperty("timestamp", nowISO())
            addProperty("sessionId", sessionId)
            addProperty("type", "file_rename")
            addProperty("oldPath", oldPath)
            addProperty("newPath", newPath)
            addProperty("oldName", oldName)
            addProperty("newName", newName)
        }

        records.add(record)
        appendRecordToRecordBook(record)
    }

    fun recordGitAction(command: String, output: String, branch: String) {
        val sessionId = activeSessionId ?: return
        val action = extractGitAction(command)
        val explanation = explainCommand(command)

        val record = JsonObject().apply {
            addProperty("id", generateId())
            addProperty("timestamp", nowISO())
            addProperty("sessionId", sessionId)
            addProperty("type", "git_action")
            addProperty("action", action)
            addProperty("command", command.trim())
            addProperty("output", output)
            addProperty("branch", branch)
            addProperty("explanation", explanation)
        }

        records.add(record)
        appendRecordToRecordBook(record)
    }

    fun recordMilestone(label: String, command: String? = null, severity: String = "success") {
        val sessionId = activeSessionId ?: return

        val record = JsonObject().apply {
            addProperty("id", generateId())
            addProperty("timestamp", nowISO())
            addProperty("sessionId", sessionId)
            addProperty("type", "milestone")
            addProperty("label", label)
            if (command != null) addProperty("command", command)
            addProperty("explanation", label)
            addProperty("severity", severity)
        }

        records.add(record)
        appendRecordToRecordBook(record)
    }

    fun checkCommandSafety(command: String): SafetyResult {
        val destructivePatterns = mapOf(
            Regex("""\brm\s+(-[rRfF]+\s+|-[a-zA-Z]*[rR][a-zA-Z]*\s+)""") to
                "This will permanently delete files and folders. There is no undo.",
            Regex("""\bgit\s+reset\s+--hard\b""") to
                "This will discard ALL uncommitted changes. They cannot be recovered.",
            Regex("""\bgit\s+push\s+.*--force\b""") to
                "This will force-push to a remote branch, potentially overwriting others' work.",
            Regex("""\bgit\s+clean\s+-[^\s]*f\b""") to
                "This will permanently delete untracked files from your repository.",
            Regex("""\bDROP\s+(TABLE|DATABASE)\b""", RegexOption.IGNORE_CASE) to
                "This will permanently delete database tables and all their data.",
            Regex("""\bDELETE\s+FROM\b""", RegexOption.IGNORE_CASE) to
                "This will permanently delete rows from a database table.",
            Regex("""\bTRUNCATE\s+(TABLE)?\b""", RegexOption.IGNORE_CASE) to
                "This will permanently delete all rows from a database table.",
            Regex("""\bchmod\s+777\b""") to
                "This gives everyone full access to the file, which is a security risk.",
            Regex("""\bsudo\s+rm\b""") to
                "This permanently deletes files with administrator privileges.",
            Regex("""\bdocker\s+(rm|rmi)\s+""") to
                "This will remove a container or image. Make sure you have backups.",
            Regex("""\bnpm\s+publish\b""") to
                "This will publish a package to the npm registry. Make sure you're ready.",
            Regex("""\bmvn\s+deploy\b""") to
                "This will deploy artifacts to a Maven repository.",
            Regex("""\bgradle\s+publish\b""") to
                "This will publish artifacts to a repository."
        )

        for ((pattern, reason) in destructivePatterns) {
            if (pattern.containsMatchIn(command)) {
                return SafetyResult("dangerous", reason, explainCommand(command))
            }
        }

        if (command.trim().startsWith("git") || command.trim().startsWith("docker")) {
            return SafetyResult("caution", "Review this command before execution.", explainCommand(command))
        }

        return SafetyResult("safe", "This command is generally safe.", explainCommand(command))
    }

    fun getRecordBookJson(): JsonObject? {
        val path = recordbookPath ?: return null
        if (!Files.exists(path)) return null
        return try {
            JsonParser.parseString(Files.readString(path)).asJsonObject
        } catch (e: Exception) {
            logger.error("Failed to read recordbook", e)
            null
        }
    }

    private fun createRecordBook(projectRoot: String) {
        val projectName = File(projectRoot).name
        val now = nowISO()

        val settings = JsonObject().apply {
            addProperty("skillLevel", "beginner")
            addProperty("language", "en")
            addProperty("aiProvider", "none")
            addProperty("recordTerminal", true)
            addProperty("recordEditor", true)
            addProperty("recordAI", true)
            addProperty("recordGit", true)
            add("excludePatterns", JsonArray().apply {
                add("node_modules"); add(".git"); add("dist"); add("build")
                add(".next"); add("__pycache__"); add(".venv"); add("venv"); add(".codeforge")
            })
            addProperty("maxStorageMB", 50)
        }

        val project = JsonObject().apply {
            addProperty("name", projectName)
            addProperty("rootPath", projectRoot)
            addProperty("detectedType", detectProjectType(projectRoot))
            add("detectedToolchain", JsonArray())
            addProperty("firstOpened", now)
            addProperty("lastOpened", now)
            addProperty("totalSessions", 0)
            addProperty("totalCommandsRecorded", 0)
        }

        val environment = JsonObject().apply {
            addProperty("javaVersion", System.getProperty("java.version"))
            addProperty("os", detectOS())
            add("detectedPackageManagers", JsonArray())
            add("detectedIssues", JsonArray())
        }

        val recordBook = JsonObject().apply {
            addProperty("version", "2.0.0")
            add("codeforge", settings)
            add("project", project)
            add("environment", environment)
            add("recipes", JsonArray())
            add("glossary", JsonArray())
            add("sessions", JsonArray())
        }

        writeRecordBook(recordBook)
    }

    private fun loadRecordBook() {
        // Already loaded on demand via getRecordBookJson()
    }

    private fun buildSessionObject(): JsonObject {
        val now = nowISO()
        return JsonObject().apply {
            addProperty("id", activeSessionId ?: generateId())
            addProperty("startedAt", Instant.ofEpochMilli(sessionStartTime).atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT))
            addProperty("platform", "jetbrains")
            addProperty("os", detectOS())
            add("summary", JsonObject().apply {
                addProperty("commandsRun", 0)
                addProperty("errorsHit", 0)
                addProperty("filesModified", 0)
                addProperty("aiPromptsUsed", 0)
                addProperty("gitActions", 0)
                addProperty("milestones", 0)
                addProperty("duration", "0s")
                addProperty("durationMs", 0)
                add("topCategories", JsonArray())
            })
            add("records", JsonArray())
        }
    }

    private fun computeSummary(): JsonObject {
        val durationMs = System.currentTimeMillis() - sessionStartTime
        val commands = records.count { it.get("type")?.asString == "terminal_command" }
        val errors = records.count { it.get("type")?.asString == "error" }
        val files = records.count {
            val t = it.get("type")?.asString
            t == "file_save" || t == "file_rename"
        }
        val gitActions = records.count { it.get("type")?.asString == "git_action" }
        val milestones = records.count { it.get("type")?.asString == "milestone" }

        val categoryCounts = records
            .filter { it.get("type")?.asString == "terminal_command" }
            .groupBy { it.get("category")?.asString ?: "unknown" }
            .map { JsonObject().apply {
                addProperty("category", it.key)
                addProperty("count", it.value.size)
            } }
            .sortedByDescending { it.get("count")?.asInt ?: 0 }
            .take(5)

        val topCategories = JsonArray()
        categoryCounts.forEach { topCategories.add(it) }

        return JsonObject().apply {
            addProperty("commandsRun", commands)
            addProperty("errorsHit", errors)
            addProperty("filesModified", files)
            addProperty("aiPromptsUsed", 0)
            addProperty("gitActions", gitActions)
            addProperty("milestones", milestones)
            addProperty("durationMs", durationMs)
            addProperty("duration", formatDuration(durationMs))
            add("topCategories", topCategories)
        }
    }

    private fun appendSessionToRecordBook(session: JsonObject) {
        lock.write {
            val rb = readRecordBookRaw() ?: return
            val sessions = rb.getAsJsonArray("sessions")
            sessions.add(session)

            val project = rb.getAsJsonObject("project")
            project.addProperty("totalSessions", project.get("totalSessions").asInt + 1)
            project.addProperty("lastOpened", nowISO())

            writeRecordBook(rb)
        }
    }

    private fun updateSessionInRecordBook(sessionId: String, updatedSession: JsonObject) {
        lock.write {
            val rb = readRecordBookRaw() ?: return
            val sessions = rb.getAsJsonArray("sessions")

            for (i in 0 until sessions.size()) {
                val s = sessions[i].asJsonObject
                if (s.get("id")?.asString == sessionId) {
                    sessions[i] = updatedSession
                    break
                }
            }

            val totalCommands = (0 until sessions.size()).sumOf { idx ->
                val records = sessions[idx].asJsonObject.getAsJsonArray("records") ?: return@sumOf 0
                records.count { it.asJsonObject.get("type")?.asString == "terminal_command" }
            }

            val project = rb.getAsJsonObject("project")
            project.addProperty("totalCommandsRecorded", totalCommands)
            project.addProperty("lastOpened", nowISO())

            writeRecordBook(rb)
        }
    }

    private fun appendRecordToRecordBook(record: JsonObject) {
        lock.write {
            val rb = readRecordBookRaw() ?: return
            val sessionId = record.get("sessionId")?.asString ?: return
            val sessions = rb.getAsJsonArray("sessions")

            for (i in 0 until sessions.size()) {
                val s = sessions[i].asJsonObject
                if (s.get("id")?.asString == sessionId) {
                    val sessionRecords = s.getAsJsonArray("records")
                    sessionRecords.add(record)

                    val summary = s.getAsJsonObject("summary")
                    val allRecords = sessionRecords
                    summary.addProperty("commandsRun",
                        allRecords.count { it.asJsonObject.get("type")?.asString == "terminal_command" })
                    summary.addProperty("errorsHit",
                        allRecords.count { it.asJsonObject.get("type")?.asString == "error" })
                    summary.addProperty("filesModified",
                        allRecords.count {
                            val t = it.asJsonObject.get("type")?.asString
                            t == "file_save" || t == "file_rename"
                        })
                    summary.addProperty("gitActions",
                        allRecords.count { it.asJsonObject.get("type")?.asString == "git_action" })
                    summary.addProperty("milestones",
                        allRecords.count { it.asJsonObject.get("type")?.asString == "milestone" })

                    val startedAt = s.get("startedAt")?.asString
                    if (startedAt != null) {
                        val startMs = try {
                            Instant.parse(startedAt).toEpochMilli()
                        } catch (_: Exception) { System.currentTimeMillis() }
                        val durationMs = System.currentTimeMillis() - startMs
                        summary.addProperty("durationMs", durationMs)
                        summary.addProperty("duration", formatDuration(durationMs))
                    }
                    break
                }
            }
            writeRecordBook(rb)
        }
    }

    private fun readRecordBookRaw(): JsonObject? {
        val path = recordbookPath ?: return null
        if (!Files.exists(path)) return null
        return try {
            JsonParser.parseString(Files.readString(path)).asJsonObject
        } catch (e: Exception) {
            logger.error("Failed to parse recordbook", e)
            null
        }
    }

    private fun writeRecordBook(recordBook: JsonObject) {
        val path = recordbookPath ?: return
        try {
            Files.writeString(path, gson.toJson(recordBook))
        } catch (e: Exception) {
            logger.error("Failed to write recordbook", e)
        }
    }

    private fun detectMilestones(command: String, output: String, exitCode: Int) {
        if (exitCode != 0) return
        val trimmed = command.trim().lowercase()

        if ((trimmed.contains("npm run build") || trimmed.contains("gradle build") ||
                    trimmed.contains("mvn package") || trimmed.contains("cargo build") ||
                    trimmed.contains("make")) &&
            output.lowercase().contains("success")
        ) {
            recordMilestone("Project built successfully!", command, "success")
        }

        if ((trimmed.contains("npm test") || trimmed.contains("gradle test") ||
                    trimmed.contains("mvn test") || trimmed.contains("cargo test") ||
                    trimmed.contains("pytest")) &&
            (output.contains("passed") || output.contains("BUILD SUCCESS") ||
                    output.contains("ok"))
        ) {
            recordMilestone("Tests passed!", command, "success")
        }

        if (trimmed.startsWith("git commit") && exitCode == 0) {
            recordMilestone("First commit!", command, "success")
        }
    }

    companion object {
        @JvmStatic
        fun getInstance(project: Project): CodeForgeProjectManager {
            return project.getService(CodeForgeProjectManager::class.java)
        }

        fun generateId(): String {
            val timestamp = System.currentTimeMillis().toString(36)
            val random = UUID.randomUUID().toString().replace("-", "").substring(0, 8)
            return "$timestamp-$random"
        }

        fun nowISO(): String {
            return Instant.now().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT)
        }

        fun formatDuration(ms: Long): String {
            if (ms < 1000) return "${ms}ms"
            val seconds = floor(ms / 1000.0).toLong()
            if (seconds < 60) return "${seconds}s"
            val minutes = floor(seconds / 60.0).toLong()
            val remainingSeconds = seconds % 60
            if (minutes < 60) {
                return if (remainingSeconds > 0) "${minutes}m ${remainingSeconds}s" else "${minutes}m"
            }
            val hours = floor(minutes / 60.0).toLong()
            val remainingMinutes = minutes % 60
            return if (remainingMinutes > 0) "${hours}h ${remainingMinutes}m" else "${hours}h"
        }

        fun detectOS(): String {
            val os = System.getProperty("os.name").lowercase()
            return when {
                os.contains("win") -> "windows"
                os.contains("mac") -> "macos"
                os.contains("linux") -> "linux"
                else -> "unknown"
            }
        }

        fun detectProjectType(projectRoot: String): String {
            val root = File(projectRoot)
            val files = root.list()?.toSet() ?: emptySet()

            return when {
                files.contains("package.json") -> "node"
                files.contains("requirements.txt") || files.contains("pyproject.toml") -> "python"
                files.contains("Cargo.toml") -> "rust"
                files.contains("go.mod") -> "go"
                files.contains("pom.xml") || files.contains("build.gradle") -> "java"
                files.contains("Gemfile") -> "ruby"
                files.contains("composer.json") -> "php"
                files.contains("pubspec.yaml") -> "flutter"
                else -> "unknown"
            }
        }

        fun categorizeCommand(command: String): String {
            val cmd = command.trim().lowercase()
            return when {
                cmd.startsWith("cd ") || cmd == "cd" || cmd.startsWith("pwd") ||
                        cmd.startsWith("ls") || cmd.startsWith("dir") || cmd.startsWith("tree") -> "navigation"
                cmd.startsWith("git ") -> "git"
                cmd.contains("npm ") || cmd.contains("yarn ") || cmd.contains("pnpm ") ||
                        cmd.contains("pip ") || cmd.contains("cargo ") || cmd.contains("maven") ||
                        cmd.contains("gradle") -> "package_manager"
                cmd.contains("build") || cmd.contains("compile") || cmd.contains("make") -> "build"
                cmd.contains("test") || cmd.contains("jest") || cmd.contains("pytest") ||
                        cmd.contains("vitest") -> "test"
                cmd.contains("deploy") || cmd.contains("vercel") || cmd.contains("heroku") -> "deploy"
                cmd.startsWith("mkdir") || cmd.startsWith("rm ") || cmd.startsWith("cp ") ||
                        cmd.startsWith("mv ") || cmd.startsWith("touch") -> "file_ops"
                cmd.startsWith("grep") || cmd.startsWith("sed ") || cmd.startsWith("awk ") ||
                        cmd.startsWith("find ") -> "text_processing"
                cmd.startsWith("curl") || cmd.startsWith("wget") || cmd.startsWith("ping") ||
                        cmd.startsWith("ssh") -> "network"
                cmd.startsWith("docker") -> "docker"
                cmd.contains("psql") || cmd.contains("mysql") || cmd.contains("mongosh") -> "database"
                cmd.startsWith("ps ") || cmd.startsWith("kill") || cmd.startsWith("top") -> "process"
                cmd.startsWith("sudo") || cmd.startsWith("chmod") || cmd.startsWith("chown") -> "system"
                cmd.startsWith("code ") || cmd.startsWith("vim") || cmd.startsWith("nano") -> "editor"
                else -> "unknown"
            }
        }

        fun explainCommand(command: String): String {
            val cmd = command.trim().lowercase()
            return when {
                cmd.startsWith("npm install") -> "Installs project dependencies defined in package.json"
                cmd.startsWith("npm run build") -> "Compiles and bundles the project for production"
                cmd.startsWith("npm test") -> "Runs the project's test suite"
                cmd.startsWith("git commit") -> "Saves staged changes to the local repository"
                cmd.startsWith("git push") -> "Uploads local commits to the remote repository"
                cmd.startsWith("git pull") -> "Downloads and integrates changes from the remote repository"
                cmd.startsWith("git branch") -> "Lists, creates, or deletes branches"
                cmd.startsWith("gradle build") -> "Compiles and builds the project using Gradle"
                cmd.startsWith("mvn") -> "Executes a Maven command"
                cmd.startsWith("docker build") -> "Builds a Docker image from a Dockerfile"
                cmd.startsWith("docker run") -> "Creates and starts a new Docker container"
                cmd.startsWith("pip install") -> "Installs a Python package"
                cmd.startsWith("cargo build") -> "Compiles a Rust project"
                cmd.startsWith("cargo test") -> "Runs Rust tests"
                cmd.startsWith("cd ") -> "Changes the current working directory"
                cmd.startsWith("ls") -> "Lists files and directories"
                cmd.startsWith("pwd") -> "Prints the current working directory"
                cmd.startsWith("mkdir") -> "Creates a new directory"
                cmd.startsWith("rm ") -> "Removes files or directories"
                cmd.startsWith("cp ") -> "Copies files or directories"
                cmd.startsWith("mv ") -> "Moves or renames files or directories"
                cmd.startsWith("curl") -> "Transfers data to or from a server"
                cmd.startsWith("grep") -> "Searches for patterns in text"
                else -> "Executes a shell command"
            }
        }

        fun isDestructiveCommand(command: String): Boolean {
            val cmd = command.trim().lowercase()
            return cmd.matches(Regex(".*\\brm\\s+(-[rRfF]+\\s+).*")) ||
                    cmd.contains("git reset --hard") ||
                    cmd.contains("git push") && cmd.contains("--force") ||
                    cmd.contains("git clean") && cmd.contains("-f") ||
                    cmd.matches(Regex(".*\\bdrop\\s+(table|database).*", RegexOption.IGNORE_CASE)) ||
                    cmd.matches(Regex(".*\\bdelete\\s+from.*", RegexOption.IGNORE_CASE)) ||
                    cmd.matches(Regex(".*\\btruncate\\s+(table)?.*", RegexOption.IGNORE_CASE)) ||
                    cmd.contains("chmod 777") ||
                    cmd.contains("sudo rm")
        }

        fun classifyError(error: String): String {
            val err = error.lowercase()
            return when {
                err.contains("eaddrinuse") || err.contains("address already in use") -> "port_conflict"
                err.contains("module_not_found") || err.contains("cannot find module") ||
                        err.contains("no module named") -> "module_not_found"
                err.contains("eacces") || err.contains("permission denied") -> "permission_denied"
                err.contains("enoent") || err.contains("no such file or directory") -> "file_not_found"
                err.contains("syntaxerror") || err.contains("syntax error") ||
                        err.contains("parse error") -> "syntax_error"
                err.contains("typeerror") || err.contains("cannot read propert") -> "type_error"
                err.contains("econnrefused") || err.contains("timeout") -> "network_error"
                err.contains("heap out of memory") || err.contains("outofmemory") -> "memory_error"
                err.contains("merge conflict") || err.contains("conflict") -> "git_conflict"
                err.contains("compilation failed") || err.contains("build failed") -> "build_error"
                else -> "unknown"
            }
        }

        fun explainError(error: String, command: String): String {
            val err = error.lowercase()
            return when {
                err.contains("eaddrinuse") -> "Port is already in use by another process"
                err.contains("module_not_found") || err.contains("cannot find module") ->
                    "A required module is missing. Try running the package installer."
                err.contains("enoent") -> "A file or directory was not found"
                err.contains("syntaxerror") -> "There is a syntax error in the code"
                err.contains("typeerror") -> "A type mismatch or null reference occurred"
                err.contains("econnrefused") -> "The connection was refused by the server"
                err.contains("heap out of memory") -> "The process ran out of memory. Try increasing heap size."
                else -> "An error occurred during command execution"
            }
        }

        fun suggestFix(error: String, command: String): String {
            val err = error.lowercase()
            return when {
                err.contains("eaddrinuse") -> "Kill the process using the port or use a different port"
                err.contains("module_not_found") || err.contains("cannot find module") ->
                    "Run the appropriate package installer (npm install, pip install, etc.)"
                err.contains("enoent") -> "Check that the file or directory path is correct"
                err.contains("syntaxerror") -> "Review the code for syntax errors"
                err.contains("econnrefused") -> "Ensure the server is running and accessible"
                err.contains("heap out of memory") -> "Increase Node.js heap size with --max-old-space-size"
                else -> "Review the error output and adjust the command accordingly"
            }
        }

        fun extractGitAction(command: String): String {
            val cmd = command.trim().lowercase()
            return when {
                cmd.startsWith("git commit") -> "commit"
                cmd.startsWith("git push") -> "push"
                cmd.startsWith("git pull") -> "pull"
                cmd.startsWith("git branch") -> "branch"
                cmd.startsWith("git checkout") || cmd.startsWith("git switch") -> "checkout"
                cmd.startsWith("git merge") -> "merge"
                cmd.startsWith("git rebase") -> "rebase"
                cmd.startsWith("git stash") -> "stash"
                cmd.startsWith("git log") -> "log"
                cmd.startsWith("git diff") -> "diff"
                cmd.startsWith("git add") -> "add"
                cmd.startsWith("git rm") -> "rm"
                cmd.startsWith("git clone") -> "clone"
                cmd.startsWith("git fetch") -> "fetch"
                else -> "other"
            }
        }
    }
}

data class SafetyResult(
    val level: String,
    val reason: String,
    val explanation: String
)
