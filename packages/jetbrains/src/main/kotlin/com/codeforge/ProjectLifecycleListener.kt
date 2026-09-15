package com.codeforge

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManagerListener

class ProjectLifecycleListener : ProjectManagerListener {

    private val logger = Logger.getInstance(ProjectLifecycleListener::class.java)

    override fun projectOpened(project: Project) {
        logger.info("CodeForge: Project opened - ${project.name}")

        val manager = CodeForgeProjectManager.getInstance(project)
        manager.initialize()
        manager.startSession()

        setupEditorListener(project)
    }

    override fun projectClosing(project: Project) {
        logger.info("CodeForge: Project closing - ${project.name}")

        val manager = CodeForgeProjectManager.getInstance(project)
        manager.endSession()

        cleanupListeners(project)
    }

    private fun setupEditorListener(project: Project) {
        val listener = EditorListener.getInstance(project)
        val connection = project.messageBus.connect()
        connection.subscribe(
            com.intellij.openapi.vfs.newvfs.BulkFileListener.TOPIC,
            listener
        )
    }

    private fun cleanupListeners(project: Project) {
        TerminalListener.getInstance(project).destroy()
    }
}
