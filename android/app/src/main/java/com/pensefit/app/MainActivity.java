package com.pensefit.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity { @Override public void onCreate(android.os.Bundle savedInstanceState) { registerPlugin(PenseActivePlugin.class); super.onCreate(savedInstanceState); } }
