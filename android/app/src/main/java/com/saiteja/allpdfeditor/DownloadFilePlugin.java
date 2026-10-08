package com.saiteja.allpdfeditor;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.util.Base64;

@CapacitorPlugin(name = "DownloadFile")
public class DownloadFilePlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        String fileName = call.getString("fileName");
        String base64Data = call.getString("data");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        if (fileName == null || base64Data == null) {
            call.reject("File name or data is missing");
            return;
        }

        try {
            byte[] fileBytes = Base64.getDecoder().decode(base64Data);

            ContentResolver resolver = getContext().getContentResolver();

            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Downloads.IS_PENDING, 1);
            }

            Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            Uri fileUri = resolver.insert(collection, values);

            if (fileUri == null) {
                call.reject("Could not create file in Downloads");
                return;
            }

            try (OutputStream outputStream = resolver.openOutputStream(fileUri)) {
                if (outputStream == null) {
                    resolver.delete(fileUri, null, null);
                    call.reject("Could not open Downloads file");
                    return;
                }

                outputStream.write(fileBytes);
                outputStream.flush();
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues updateValues = new ContentValues();
                updateValues.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(fileUri, updateValues, null, null);
            }

            JSObject result = new JSObject();
            result.put("uri", fileUri.toString());

            call.resolve(result);

        } catch (Exception e) {
            call.reject("Download failed: " + e.getMessage());
        }
    }
}