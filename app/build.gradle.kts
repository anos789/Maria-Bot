import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.mexc.mariabot"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.mexc.mariabot"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("release") {
            var keystoreFile = file("release.keystore")
            var keystorePassword = System.getenv("CM_KEYSTORE_PASSWORD") ?: ""
            var keyAlias = System.getenv("CM_KEY_ALIAS") ?: ""
            var keyPassword = System.getenv("CM_KEYSTORE_PASSWORD") ?: ""

            val keyPropertiesFile = rootProject.file("key.properties")
            if (keyPropertiesFile.exists()) {
                val properties = Properties()
                properties.load(FileInputStream(keyPropertiesFile))
                if (properties.containsKey("storeFile")) {
                    keystoreFile = file(properties.getProperty("storeFile"))
                } else if (properties.containsKey("storeFileRelative")) {
                    keystoreFile = file(properties.getProperty("storeFileRelative"))
                }
                keystorePassword = properties.getProperty("storePassword", keystorePassword) ?: ""
                keyAlias = properties.getProperty("keyAlias", keyAlias) ?: ""
                keyPassword = properties.getProperty("keyPassword", keyPassword) ?: ""
            }

            if (keystoreFile.exists() && keystorePassword.isNotEmpty() && keyAlias.isNotEmpty()) {
                storeFile = keystoreFile
                storePassword = keystorePassword
                this.keyAlias = keyAlias
                this.keyPassword = keyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}
