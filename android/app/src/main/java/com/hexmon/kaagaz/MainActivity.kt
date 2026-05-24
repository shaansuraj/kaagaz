package com.hexmon.kaagaz

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.animation.AnimatorListenerAdapter
import android.os.Bundle
import android.view.View
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    val splashScreen = installSplashScreen()
    splashScreen.setOnExitAnimationListener { splashScreenView ->
      val splashView = splashScreenView.view
      val fade = ObjectAnimator.ofFloat(splashView, View.ALPHA, 1f, 0f)

      AnimatorSet().apply {
        duration = 180L
        playTogether(fade)
        addListener(
          object : AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: android.animation.Animator) {
              splashScreenView.remove()
            }
          },
        )
        start()
      }
    }

    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "Kaagaz"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
