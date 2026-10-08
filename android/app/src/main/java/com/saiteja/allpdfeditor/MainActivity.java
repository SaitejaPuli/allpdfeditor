package com.saiteja.allpdfeditor;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DownloadFilePlugin.class);
        super.onCreate(savedInstanceState);
    }
}