package com.codeforge.ui

import com.codeforge.CodeForgeProjectManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import java.awt.BorderLayout
import javax.swing.JPanel

class RecallToolWindow(private val project: Project) {

    private val logger = Logger.getInstance(RecallToolWindow::class.java)
    private var browser: JBCefBrowser? = null
    private var jsQuery: JBCefJSQuery? = null
    private val manager get() = CodeForgeProjectManager.getInstance(project)

    fun createComponent(): JPanel {
        val panel = JPanel(BorderLayout())

        browser = JBCefBrowser()
        jsQuery = JBCefJSQuery.create(browser!!)

        jsQuery?.addHandler { message ->
            handleMessageFromBrowser(message)
        }

        browser!!.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(b: CefBrowser, frame: CefFrame, httpStatusCode: Int) {
                if (frame.isMain) {
                    sendDataToBrowser()
                }
            }
        }, browser!!.cefBrowser)

        browser!!.loadHTML(getDashboardHTML(), "http://codeforge.local")

        panel.add(browser!!.component, BorderLayout.CENTER)

        return panel
    }

    private fun handleMessageFromBrowser(message: String) {
        try {
            val parts = message.split(":", limit = 2)
            val action = parts.getOrElse(0) { "" }
            val payload = parts.getOrElse(1) { "" }

            when (action) {
                "refresh" -> {
                    sendDataToBrowser()
                }
                "search" -> {
                    val results = searchRecords(payload)
                    sendResultsToBrowser("searchResults", results)
                }
                "export" -> {
                    val exportData = exportRecordBook(payload)
                    sendResultsToBrowser("exportData", exportData)
                }
            }
        } catch (e: Exception) {
            logger.error("Error handling browser message: ${e.message}", e)
        }
    }

    private fun sendDataToBrowser() {
        val recordBook = manager.getRecordBookJson()
        if (recordBook != null) {
            val json = recordBook.toString()
            val escapedJson = escapeForJs(json)
            browser?.executeJavaScript(
                "window.receiveRecordBook(JSON.parse('$escapedJson'))",
                browser!!.url,
                0
            )
        } else {
            browser?.executeJavaScript(
                "window.receiveRecordBook(null)",
                browser!!.url,
                0
            )
        }
    }

    private fun sendResultsToBrowser(type: String, data: String) {
        val escapedData = escapeForJs(data)
        browser?.executeJavaScript(
            "window.receiveMessage({type: '$type', data: JSON.parse('$escapedData')})",
            browser!!.url,
            0
        )
    }

    private fun escapeForJs(text: String): String {
        return text
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
            .replace("\u0000", "")
    }

    private fun searchRecords(query: String): String {
        val recordBook = manager.getRecordBookJson() ?: return "[]"
        val sessions = recordBook.getAsJsonArray("sessions") ?: return "[]"

        val results = mutableListOf<String>()
        val lowerQuery = query.lowercase()

        for (i in 0 until sessions.size()) {
            val session = sessions[i].asJsonObject
            val records = session.getAsJsonArray("records") ?: continue

            for (j in 0 until records.size()) {
                val record = records[j].asJsonObject
                val type = record.get("type")?.asString ?: continue

                val matches = when (type) {
                    "terminal_command" -> {
                        val cmd = record.get("command")?.asString?.lowercase() ?: ""
                        val explanation = record.get("explanation")?.asString?.lowercase() ?: ""
                        cmd.contains(lowerQuery) || explanation.contains(lowerQuery)
                    }
                    "error" -> {
                        val error = record.get("error")?.asString?.lowercase() ?: ""
                        val cmd = record.get("command")?.asString?.lowercase() ?: ""
                        error.contains(lowerQuery) || cmd.contains(lowerQuery)
                    }
                    "file_save" -> {
                        val path = record.get("path")?.asString?.lowercase() ?: ""
                        val name = record.get("fileName")?.asString?.lowercase() ?: ""
                        path.contains(lowerQuery) || name.contains(lowerQuery)
                    }
                    "file_rename" -> {
                        val oldName = record.get("oldName")?.asString?.lowercase() ?: ""
                        val newName = record.get("newName")?.asString?.lowercase() ?: ""
                        oldName.contains(lowerQuery) || newName.contains(lowerQuery)
                    }
                    "ai_prompt" -> {
                        val prompt = record.get("prompt")?.asString?.lowercase() ?: ""
                        prompt.contains(lowerQuery)
                    }
                    "milestone" -> {
                        val label = record.get("label")?.asString?.lowercase() ?: ""
                        label.contains(lowerQuery)
                    }
                    "git_action" -> {
                        val action = record.get("action")?.asString?.lowercase() ?: ""
                        val cmd = record.get("command")?.asString?.lowercase() ?: ""
                        action.contains(lowerQuery) || cmd.contains(lowerQuery)
                    }
                    else -> false
                }

                if (matches) {
                    results.add(record.toString())
                }
            }
        }

        return "[${results.joinToString(",")}]"
    }

    private fun exportRecordBook(format: String): String {
        val recordBook = manager.getRecordBookJson() ?: return ""
        return when (format) {
            "json" -> recordBook.toString()
            "markdown" -> exportAsMarkdown(recordBook)
            "html" -> exportAsHtml(recordBook)
            else -> recordBook.toString()
        }
    }

    private fun exportAsMarkdown(recordBook: com.google.gson.JsonObject): String {
        val sb = StringBuilder()
        sb.appendLine("# CodeForge Record Book")

        val project = recordBook.getAsJsonObject("project")
        sb.appendLine("**Project:** ${project.get("name")?.asString}")
        sb.appendLine("**Type:** ${project.get("detectedType")?.asString}")
        sb.appendLine()

        val sessions = recordBook.getAsJsonArray("sessions")
        sb.appendLine("**Total Sessions:** ${sessions?.size() ?: 0}")
        sb.appendLine()
        sb.appendLine("---")
        sb.appendLine()

        for (i in 0 until (sessions?.size() ?: 0)) {
            val session = sessions!![i].asJsonObject
            val startedAt = session.get("startedAt")?.asString ?: "unknown"
            val summary = session.getAsJsonObject("summary")

            sb.appendLine("## Session: $startedAt")
            sb.appendLine(
                "**Duration:** ${summary?.get("duration")?.asString ?: "unknown"} | " +
                        "**Commands:** ${summary?.get("commandsRun")?.asInt ?: 0} | " +
                        "**Errors:** ${summary?.get("errorsHit")?.asInt ?: 0}"
            )
            sb.appendLine()

            val records = session.getAsJsonArray("records")
            for (j in 0 until (records?.size() ?: 0)) {
                val record = records!![j].asJsonObject
                val type = record.get("type")?.asString

                when (type) {
                    "terminal_command" -> {
                        sb.appendLine("### Command")
                        sb.appendLine("```")
                        sb.appendLine(record.get("command")?.asString)
                        sb.appendLine("```")
                        val explanation = record.get("explanation")?.asString
                        if (!explanation.isNullOrEmpty()) {
                            sb.appendLine("> $explanation")
                        }
                        sb.appendLine()
                    }
                    "error" -> {
                        sb.appendLine("### Error")
                        sb.appendLine("**Command:** `${record.get("command")?.asString}`")
                        sb.appendLine("**Error:** ${record.get("error")?.asString}")
                        val diagnosis = record.get("diagnosis")?.asString
                        if (!diagnosis.isNullOrEmpty()) {
                            sb.appendLine("> $diagnosis")
                        }
                        sb.appendLine()
                    }
                    "milestone" -> {
                        sb.appendLine("### ${record.get("label")?.asString}")
                        sb.appendLine()
                    }
                }
            }
        }

        return sb.toString()
    }

    private fun exportAsHtml(recordBook: com.google.gson.JsonObject): String {
        val md = exportAsMarkdown(recordBook)
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: sans-serif; padding: 20px; background: #1a1a2e; color: #e0e0e0; }
                    h1 { color: #f77f00; }
                    h2 { color: #4cc9f0; }
                    h3 { color: #7209b7; }
                    code { background: #16213e; padding: 2px 6px; border-radius: 4px; }
                    pre { background: #16213e; padding: 10px; border-radius: 6px; }
                    blockquote { border-left: 3px solid #f77f00; padding-left: 10px; color: #adb5bd; }
                </style>
            </head>
            <body>
                <pre>$md</pre>
            </body>
            </html>
        """.trimIndent()
    }

    fun dispose() {
        jsQuery?.let {
            browser?.removeQuery(it)
        }
        browser?.dispose()
        browser = null
        jsQuery = null
    }

    private fun getDashboardHTML(): String {
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeForge Recall Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0d1117;
            color: #e6edf3;
            padding: 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { color: #f78166; font-size: 24px; margin-bottom: 5px; }
        .subtitle { color: #8b949e; font-size: 14px; margin-bottom: 20px; }
        .search-box {
            width: 100%; padding: 12px 16px; background: #161b22;
            border: 1px solid #30363d; border-radius: 8px;
            color: #e6edf3; font-size: 15px; margin-bottom: 20px;
        }
        .search-box:focus { border-color: #f78166; outline: none; }
        .session-card {
            background: #161b22; border: 1px solid #30363d;
            border-radius: 10px; padding: 16px; margin-bottom: 12px;
        }
        .session-header {
            display: flex; justify-content: space-between;
            align-items: center; margin-bottom: 10px;
        }
        .session-date { color: #f78166; font-weight: 600; }
        .session-stats { display: flex; gap: 12px; }
        .stat { font-size: 13px; color: #8b949e; }
        .stat strong { color: #e6edf3; }
        .timeline { margin-top: 10px; }
        .record {
            padding: 8px 12px; border-left: 3px solid #30363d;
            margin-bottom: 6px; border-radius: 0 6px 6px 0;
            background: #0d1117;
        }
        .record.command { border-left-color: #58a6ff; }
        .record.error { border-left-color: #f85149; }
        .record.file { border-left-color: #3fb950; }
        .record.ai { border-left-color: #a371f7; }
        .record.milestone { border-left-color: #f78166; }
        .record.git { border-left-color: #d2a8ff; }
        .record-time { font-size: 11px; color: #8b949e; }
        .record-label { font-size: 14px; margin-top: 2px; }
        .record-explanation {
            font-size: 12px; color: #8b949e;
            margin-top: 4px; font-style: italic;
        }
        .record-command {
            font-family: 'SF Mono', Consolas, monospace;
            font-size: 13px; color: #79c0ff;
        }
        .record-error-msg { font-size: 13px; color: #f85149; }
        .empty-state { text-align: center; padding: 60px 20px; color: #8b949e; }
        .empty-state h2 { color: #e6edf3; margin-bottom: 10px; }
        .btn {
            padding: 8px 16px; border-radius: 6px;
            border: 1px solid #30363d; background: #21262d;
            color: #e6edf3; cursor: pointer; font-size: 13px;
        }
        .btn:hover { background: #30363d; }
        .btn-primary { background: #f78166; color: #0d1117; border-color: #f78166; }
        .btn-primary:hover { background: #ff9a76; }
        .actions { display: flex; gap: 8px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>CodeForge Recall</h1>
        <div class="subtitle">Your project command history and learning record</div>

        <input type="text" class="search-box" placeholder="Search commands, errors, prompts..." id="search" />

        <div class="actions">
            <button class="btn" onclick="refresh()">Refresh</button>
            <button class="btn" onclick="exportAs('markdown')">Export MD</button>
            <button class="btn" onclick="exportAs('html')">Export HTML</button>
        </div>

        <div id="content">
            <div class="empty-state">
                <h2>No Data Yet</h2>
                <p>Start using the terminal and CodeForge will record your commands automatically.</p>
            </div>
        </div>
    </div>

    <script>
        let recordBook = null;

        function receiveRecordBook(rb) {
            recordBook = rb;
            renderRecordBook(rb);
        }

        function receiveMessage(msg) {
            if (msg.type === 'searchResults') {
                renderSearchResults(msg.data);
            } else if (msg.type === 'exportData') {
                downloadExport(msg.data);
            }
        }

        function refresh() {
            sendToPlugin('refresh:');
        }

        function search(query) {
            if (query.length > 0) {
                sendToPlugin('search:' + query);
            } else {
                renderRecordBook(recordBook);
            }
        }

        function exportAs(format) {
            sendToPlugin('export:' + format);
        }

        function sendToPlugin(message) {
            if (window.intellij) {
                window.intellij.postMessage(message);
            }
        }

        function renderRecordBook(rb) {
            const content = document.getElementById('content');
            if (!rb || !rb.sessions || rb.sessions.length === 0) {
                content.innerHTML = '<div class="empty-state"><h2>No Data Yet</h2><p>Start using the terminal and CodeForge will record your commands automatically.</p></div>';
                return;
            }

            let html = '';
            const sessions = [...rb.sessions].reverse();

            for (const session of sessions) {
                const date = new Date(session.startedAt).toLocaleString();
                html += '<div class="session-card">';
                html += '<div class="session-header">';
                html += '<span class="session-date">' + date + '</span>';
                html += '<div class="session-stats">';
                html += '<span class="stat"><strong>' + (session.summary?.commandsRun || 0) + '</strong> commands</span>';
                html += '<span class="stat"><strong>' + (session.summary?.errorsHit || 0) + '</strong> errors</span>';
                html += '<span class="stat"><strong>' + (session.summary?.filesModified || 0) + '</strong> files</span>';
                html += '<span class="stat">' + (session.summary?.duration || '0s') + '</span>';
                html += '</div></div>';

                html += '<div class="timeline">';
                const records = [...(session.records || [])].reverse().slice(0, 50);
                for (const record of records) {
                    const time = new Date(record.timestamp).toLocaleTimeString();
                    const cls = getRecordClass(record.type);
                    const content = getRecordContent(record);

                    html += '<div class="record ' + cls + '">';
                    html += '<div class="record-time">' + time + '</div>';
                    html += '<div class="record-label">' + content.label + '</div>';
                    if (content.explanation) {
                        html += '<div class="record-explanation">' + content.explanation + '</div>';
                    }
                    html += '</div>';
                }
                html += '</div></div>';
            }

            content.innerHTML = html;
        }

        function renderSearchResults(results) {
            const content = document.getElementById('content');
            if (!results || results.length === 0) {
                content.innerHTML = '<div class="empty-state"><h2>No Results</h2><p>Try a different search query.</p></div>';
                return;
            }

            let html = '';
            for (const record of results) {
                const time = new Date(record.timestamp).toLocaleString();
                const cls = getRecordClass(record.type);
                const content = getRecordContent(record);

                html += '<div class="record ' + cls + '">';
                html += '<div class="record-time">' + time + '</div>';
                html += '<div class="record-label">' + content.label + '</div>';
                if (content.explanation) {
                    html += '<div class="record-explanation">' + content.explanation + '</div>';
                }
                html += '</div>';
            }

            content.innerHTML = html;
        }

        function getRecordClass(type) {
            switch (type) {
                case 'terminal_command': return 'command';
                case 'error': return 'error';
                case 'file_save':
                case 'file_rename': return 'file';
                case 'ai_prompt': return 'ai';
                case 'milestone': return 'milestone';
                case 'git_action': return 'git';
                default: return '';
            }
        }

        function getRecordContent(record) {
            switch (record.type) {
                case 'terminal_command':
                    return {
                        label: '<span class="record-command">$ ' + escapeHtml(record.command) + '</span>',
                        explanation: record.explanation
                    };
                case 'error':
                    return {
                        label: '<span class="record-error-msg">\u2717 ' + escapeHtml(record.error) + '</span>',
                        explanation: record.diagnosis
                    };
                case 'file_save':
                    return { label: record.fileName, explanation: record.path };
                case 'file_rename':
                    return { label: record.oldName + ' \u2192 ' + record.newName, explanation: '' };
                case 'ai_prompt':
                    return { label: escapeHtml((record.prompt || '').slice(0, 80)), explanation: 'via ' + record.source };
                case 'milestone':
                    return { label: record.label, explanation: record.explanation };
                case 'git_action':
                    return { label: 'git ' + record.action, explanation: record.explanation };
                default:
                    return { label: record.type, explanation: '' };
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function downloadExport(data) {
            const blob = new Blob([data], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'codeforge-export.txt';
            a.click();
            URL.revokeObjectURL(url);
        }

        document.getElementById('search').addEventListener('input', function(e) {
            search(e.target.value);
        });

        refresh();
    </script>
</body>
</html>
        """.trimIndent()
    }
}
