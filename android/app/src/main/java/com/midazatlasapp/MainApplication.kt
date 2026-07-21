package com.midazatlasapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

import com.midazatlasapp.device.MidazAtlasDevicePackage
import com.midazatlasapp.ecr.MidazAtlasEcrPackage
import com.midazatlasapp.printer.MidazAtlasPrinterPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(MidazAtlasDevicePackage())
          add(MidazAtlasPrinterPackage())
          add(MidazAtlasEcrPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
