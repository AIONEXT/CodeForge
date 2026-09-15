package com.codeforge

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.AsyncFileListener
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.newvfs.events.VFileContentEvent
import com.intellij.openapi.vfs.newvfs.events.VFileCopyEvent
import com.intellij.openapi.vfs.newvfs.events.VFileCreateEvent
import com.intellij.openapi.vfs.newvfs.events.VFileDeleteEvent
import com.intellij.openapi.vfs.newvfs.events.VFileEvent
import com.intellij.openapi.vfs.newvfs.events.VFileMoveEvent
import com.intellij.openapi.vfs.newvfs.events.VFilePropertyChangeEvent
import java.io.File

class EditorListener(private val project: Project) : AsyncFileListener {

    private val logger = Logger.getInstance(EditorListener::class.java)
    private val manager get() = CodeForgeProjectManager.getInstance(project)

    override fun prepareChange(events: MutableList<VFileEvent>): AsyncFileListener.ChangeApplier? {
        if (!manager.isActive) return null

        val relevantEvents = events.filter { event ->
            isRelevantEvent(event)
        }

        if (relevantEvents.isEmpty()) return null

        return object : AsyncFileListener.ChangeApplier {
            override fun afterVfsChange() {
                for (event in relevantEvents) {
                    handleEvent(event)
                }
            }
        }
    }

    private fun isRelevantEvent(event: VFileEvent): Boolean {
        return when (event) {
            is VFileContentEvent -> true
            is VFileMoveEvent -> true
            is VFileDeleteEvent -> true
            is VFileCreateEvent -> true
            is VFileCopyEvent -> true
            is VFilePropertyChangeEvent -> event.propertyName == VirtualFile.PROP_NAME
            else -> false
        }
    }

    private fun handleEvent(event: VFileEvent) {
        try {
            when (event) {
                is VFileContentEvent -> handleContentChange(event)
                is VFileMoveEvent -> handleMove(event)
                is VFileDeleteEvent -> handleDelete(event)
                is VFileCreateEvent -> handleCreate(event)
                is VFileCopyEvent -> handleCopy(event)
                is VFilePropertyChangeEvent -> handlePropertyChange(event)
            }
        } catch (e: Exception) {
            logger.warn("Error handling file event: ${e.message}")
        }
    }

    private fun handleContentChange(event: VFileContentEvent) {
        val file = event.file
        if (isGeneratedFile(file)) return

        val path = file.path
        val language = detectLanguage(file)
        val size = file.length

        manager.recordFileSave(path, language, size)
    }

    private fun handleMove(event: VFileMoveEvent) {
        val oldPath = event.oldPath
        val newPath = event.newPath

        if (isPathGenerated(oldPath) || isPathGenerated(newPath)) return

        manager.recordFileRename(oldPath, newPath)
    }

    private fun handleDelete(event: VFileDeleteEvent) {
        val file = event.file
        if (isGeneratedFile(file)) return

        // Record deletion as a file save with special marker
        val path = file.path
        val language = detectLanguage(file)

        // We record it as a milestone since file deletion is notable
        manager.recordMilestone("File deleted: ${file.name}", "rm ${file.name}", "info")
    }

    private fun handleCreate(event: VFileCreateEvent) {
        val file = event.file ?: return
        if (isGeneratedFile(file)) return

        val path = file.path
        val language = detectLanguage(file)

        manager.recordFileSave(path, language, 0)
    }

    private fun handleCopy(event: VFileCopyEvent) {
        val newFile = event.newParent?.findChild(event.newChildName) ?: return
        if (isGeneratedFile(newFile)) return

        val newPath = newFile.path
        val originalPath = event.originalFile?.path ?: return

        manager.recordFileRename(originalPath, newPath)
    }

    private fun handlePropertyChange(event: VFilePropertyChangeEvent) {
        if (event.propertyName != VirtualFile.PROP_NAME) return

        val file = event.file
        if (isGeneratedFile(file)) return

        val oldName = event.oldValue as? String ?: return
        val newName = event.newValue as? String ?: return

        val parentPath = file.parent?.path ?: return
        val oldPath = "$parentPath${File.separator}$oldName"
        val newPath = "$parentPath${File.separator}$newName"

        manager.recordFileRename(oldPath, newPath)
    }

    private fun isGeneratedFile(file: VirtualFile): Boolean {
        val path = file.path
        return isPathGenerated(path)
    }

    private fun isPathGenerated(path: String): Boolean {
        val generatedDirs = listOf(
            "node_modules", ".git", "dist", "build", ".next",
            "__pycache__", ".venv", "venv", ".codeforge",
            "target", "bin", "obj", ".gradle", ".idea"
        )
        val pathParts = path.replace("\\", "/").split("/")
        return pathParts.any { it in generatedDirs }
    }

    private fun detectLanguage(file: VirtualFile): String {
        val extension = file.extension?.lowercase() ?: return "unknown"
        return when (extension) {
            "kt", "kts" -> "kotlin"
            "java" -> "java"
            "ts", "tsx" -> "typescript"
            "js", "jsx" -> "javascript"
            "py" -> "python"
            "rs" -> "rust"
            "go" -> "go"
            "rb" -> "ruby"
            "php" -> "php"
            "c", "cpp", "h", "hpp" -> "c++"
            "cs" -> "csharp"
            "swift" -> "swift"
            "dart" -> "dart"
            "html", "htm" -> "html"
            "css" -> "css"
            "scss", "sass" -> "scss"
            "json" -> "json"
            "xml" -> "xml"
            "yaml", "yml" -> "yaml"
            "md" -> "markdown"
            "sql" -> "sql"
            "sh", "bash" -> "shell"
            "gradle" -> "gradle"
            "xml" -> "xml"
            "properties" -> "properties"
            else -> extension
        }
    }

    companion object {
        private var instance: EditorListener? = null

        fun getInstance(project: Project): EditorListener {
            return instance ?: synchronized(this) {
                instance ?: EditorListener(project).also { instance = it }
            }
        }
    }
}
