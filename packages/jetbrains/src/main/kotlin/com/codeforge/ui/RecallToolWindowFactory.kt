package com.codeforge.ui

import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

class RecallToolWindowFactory : ToolWindowFactory, DumbAware {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val recallToolWindow = RecallToolWindow(project)
        val content = ContentFactory.getInstance().createContent(
            recallToolWindow.createComponent(),
            "Recall Dashboard",
            false
        )
        toolWindow.contentManager.addContent(content)
    }

    override fun isApplicable(project: Project): Boolean {
        return true
    }
}
