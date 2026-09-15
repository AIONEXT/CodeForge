package com.codeforge

import com.intellij.execution.process.ProcessEvent
import com.intellij.execution.process.ProcessListener
import com.intellij.execution.process.ProcessOutputType
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.intellij.terminal.TerminalWidget
import com.intellij.terminal.TerminalWidgetListener
import com.intellij.util.concurrency.AppExecutorUtil
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

class TerminalListener(private val project: Project) {

    private val logger = Logger.getInstance(TerminalListener::class.java)
    private val manager get() = CodeForgeProjectManager.getInstance(project)

    private data class TerminalState(
        val commandBuffer: StringBuilder = StringBuilder(),
        val outputBuffer: StringBuilder = StringBuilder(),
        var currentCommand: String = "",
        var commandStartTime: Long = 0L,
        var cwd: String = project.basePath ?: System.getProperty("user.dir"),
        var shell: String = "unknown"
    )

    private val terminalStates = ConcurrentHashMap<Int, TerminalState>()
    private val pendingCommands = CopyOnWriteArrayList<PendingCommand>()

    private data class PendingCommand(
        val command: String,
        val startTime: Long,
        val cwd: String,
        val shell: String
    )

    fun attachToTerminal(terminal: TerminalWidget, terminalId: Int) {
        val state = TerminalState()
        terminalStates[terminalId] = state

        terminal.addTerminalWidgetListener(object : TerminalWidgetListener {
            override fun terminalCreated(terminalWidget: TerminalWidget, parentCreated: Boolean) {
                // Terminal created
            }

            override fun terminalFocusChanged(terminalWidget: TerminalWidget, focused: Boolean) {
                // Focus changed
            }
        })

        terminal.process?.addProcessListener(object : ProcessListener {
            override fun startNotified(event: ProcessEvent) {
                // Process started
            }

            override fun processTerminated(event: ProcessEvent) {
                val exitCode = event.exitCode
                val pending = pendingCommands.lastOrNull() ?: return

                val duration = System.currentTimeMillis() - pending.startTime
                val output = state.outputBuffer.toString().trim()

                if (pending.command.isNotBlank()) {
                    AppExecutorUtil.getAppExecutorService().execute {
                        manager.recordTerminalCommand(
                            pending.command,
                            output,
                            exitCode,
                            duration,
                            pending.cwd,
                            pending.shell
                        )
                    }
                }

                state.outputBuffer.clear()
                state.currentCommand = ""
                state.commandStartTime = 0L
                pendingCommands.remove(pending)
            }

            override fun processWillTerminate(event: ProcessEvent, willBeDestroyed: Boolean) {
                // Will terminate
            }

            override fun onTextAvailable(event: ProcessEvent, outputType: Key<*>) {
                if (outputType == ProcessOutputType.STDOUT || outputType == ProcessOutputType.STDERR) {
                    state.outputBuffer.append(event.text)
                }
            }
        })

        logger.info("Attached to terminal $terminalId")
    }

    fun detachFromTerminal(terminalId: Int) {
        terminalStates.remove(terminalId)
        logger.info("Detached from terminal $terminalId")
    }

    fun destroy() {
        terminalStates.clear()
        pendingCommands.clear()
    }

    companion object {
        private var instance: TerminalListener? = null

        fun getInstance(project: Project): TerminalListener {
            return instance ?: synchronized(this) {
                instance ?: TerminalListener(project).also { instance = it }
            }
        }

        fun stripAnsiCodes(text: String): String {
            return text.replace(Regex("""[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]"""), "")
        }
    }
}
