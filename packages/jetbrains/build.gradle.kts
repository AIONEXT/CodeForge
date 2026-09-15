plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.24"
    id("org.jetbrains.intellij.platform") version "2.2.1"
}

group = "com.codeforge"
version = "1.0.0"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.1")
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }
    implementation("com.google.code.gson:gson:2.11.0")
}

kotlin {
    jvmToolchain(17)
}

tasks {
    patchPluginXml {
        sinceBuild.set("241.*")
        untilBuild.set("251.*")
    }

    buildSearchableOptions {
        enabled = false
    }

    runIde {
        jvmArgs("-Xmx2048m")
    }
}
