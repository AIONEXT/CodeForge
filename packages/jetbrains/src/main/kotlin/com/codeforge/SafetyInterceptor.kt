package com.codeforge

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.terminal.TerminalWidget
import java.awt.event.ActionEvent
import java.awt.event.ActionListener
import javax.swing.Timer

class SafetyInterceptor(private val project: Project) {

    private val logger = Logger.getInstance(SafetyInterceptor::class.java)
    private val manager get() = CodeForgeProjectManager.getInstance(project)

    private val destructivePatterns = listOf(
        DestructivePattern(
            Regex("""\brm\s+(-[rRfF]+\s+|-[a-zA-Z]*[rR][a-zA-Z]*\s+)"""),
            "This will permanently delete files and folders. There is no undo."
        ),
        DestructivePattern(
            Regex("""\bgit\s+reset\s+--hard\b"""),
            "This will discard ALL uncommitted changes. They cannot be recovered."
        ),
        DestructivePattern(
            Regex("""\bgit\s+push\s+.*--force\b"""),
            "This will force-push to a remote branch, potentially overwriting others' work."
        ),
        DestructivePattern(
            Regex("""\bgit\s+clean\s+-[^\s]*f\b"""),
            "This will permanently delete untracked files from your repository."
        ),
        DestructivePattern(
            Regex("""\bDROP\s+(TABLE|DATABASE)\b""", RegexOption.IGNORE_CASE),
            "This will permanently delete database tables and all their data."
        ),
        DestructivePattern(
            Regex("""\bDELETE\s+FROM\b""", RegexOption.IGNORE_CASE),
            "This will permanently delete rows from a database table."
        ),
        DestructivePattern(
            Regex("""\bTRUNCATE\s+(TABLE)?\b""", RegexOption.IGNORE_CASE),
            "This will permanently delete all rows from a database table."
        ),
        DestructivePattern(
            Regex("""\bchmod\s+777\b"""),
            "This gives everyone full access to the file, which is a security risk."
        ),
        DestructivePattern(
            Regex("""\bsudo\s+rm\b"""),
            "This permanently deletes files with administrator privileges."
        ),
        DestructivePattern(
            Regex("""\bdocker\s+(rm|rmi)\s+"""),
            "This will remove a container or image. Make sure you have backups."
        ),
        DestructivePattern(
            Regex("""\bnpm\s+publish\b"""),
            "This will publish a package to the npm registry. Make sure you're ready."
        ),
        DestructivePattern(
            Regex("""\bmvn\s+deploy\b"""),
            "This will deploy artifacts to a Maven repository."
        ),
        DestructivePattern(
            Regex("""\bgradle\s+publish\b"""),
            "This will publish artifacts to a repository."
        )
    )

    fun checkCommand(command: String): SafetyCheckResult {
        val matchedPattern = destructivePatterns.firstOrNull { it.pattern.containsMatchIn(command) }

        if (matchedPattern != null) {
            val safety = manager.checkCommandSafety(command)
            return SafetyCheckResult(
                isDestructive = true,
                reason = matchedPattern.reason,
                level = safety.level,
                explanation = safety.explanation,
                command = command
            )
        }

        return SafetyCheckResult(
            isDestructive = false,
            reason = "",
            level = "safe",
            explanation = manager.checkCommandSafety(command).explanation,
            command = command
        )
    }

    fun showWarningDialog(result: SafetyCheckResult): SafetyDecision {
        if (!result.isDestructive) {
            return SafetyDecision.ALLOW
        }

        val message = buildString {
            appendLine("CodeForge Safety Check")
            appendLine()
            appendLine("Command: ${result.command}")
            appendLine()
            appendLine("Warning: ${result.reason}")
            appendLine()
            appendLine("Explanation: ${result.explanation}")
            appendLine()
            appendLine("Do you want to proceed?")
        }

        val dialogResult = Messages.showYesNoCancelDialog(
            project,
            message,
            "CodeForge Safety Warning",
            "Run Anyway",
            "Cancel",
            "Show Explanation",
            Messages.getWarningIcon()
        )

        return when (dialogResult) {
            Messages.YES -> SafetyDecision.ALLOW
            Messages.NO -> SafetyDecision.CANCEL
            Messages.CANCEL -> SafetyDecision.SHOW_EXPLANATION
            else -> SafetyDecision.CANCEL
        }
    }

    fun showExplanation(result: SafetyCheckResult) {
        val notification = NotificationGroupManager.getInstance()
            .getNotificationGroup("CodeForge Safety")
            .createNotification(
                "CodeForge Safety Check",
                "<b>Command:</b> ${escapeHtml(result.command)}<br>" +
                        "<b>Risk Level:</b> ${result.level.uppercase()}<br>" +
                        "<b>Reason:</b> ${escapeHtml(result.reason)}<br>" +
                        "<b>Explanation:</b> ${escapeHtml(result.explanation)}",
                NotificationType.WARNING
            )
            .notify(project)
    }

    fun showSafetyNotification(result: SafetyCheckResult) {
        val notification = NotificationGroupManager.getInstance()
            .getNotificationGroup("CodeForge Safety")
            .createNotification(
                "CodeForge: Destructive Command Detected",
                "${result.reason}<br><b>Command:</b> ${escapeHtml(result.command)}",
                NotificationType.WARNING
            )
            .notify(project)
    }

    private fun escapeHtml(text: String): String {
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#039;")
    }

    data class DestructivePattern(
        val pattern: Regex,
        val reason: String
    )

    data class SafetyCheckResult(
        val isDestructive: Boolean,
        val reason: String,
        val level: String,
        val explanation: String,
        val command: String
    )

    enum class SafetyDecision {
        ALLOW,
        CANCEL,
        SHOW_EXPLANATION
    }

    companion object {
        private var instance: SafetyInterceptor? = null

        fun getInstance(project: Project): SafetyInterceptor {
            return instance ?: synchronized(this) {
                instance ?: SafetyInterceptor(project).also { instance = it }
            }
        }
    }
}
