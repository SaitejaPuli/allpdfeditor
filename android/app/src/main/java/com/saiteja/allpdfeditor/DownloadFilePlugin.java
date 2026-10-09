
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
        String mimeType = call.getString(
            "mimeType", "application/octet-stream"
        );

        if (fileName == null || base64Data == null) {
            call.reject("File name or data is missing");
            return;
        }

        Uri fileUri = null;

        try {
            byte[] fileBytes = Base64.getDecoder().decode(base64Data);
            ContentResolver resolver = getContext().getContentResolver();

            String safeName = fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
            String baseName = safeName;
            String extension = "";

            int dot = safeName.lastIndexOf('.');
            if (dot > 0) {
                baseName = safeName.substring(0, dot);
                extension = safeName.substring(dot);
            }

            for (int i = 0; i < 100; i++) {
                String candidate = i == 0
                    ? safeName
                    : baseName + " (" + i + ")" + extension;

                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, candidate);
                values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    values.put(MediaStore.MediaColumns.IS_PENDING, 1);
                }

                fileUri = resolver.insert(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI, values
                );

                if (fileUri != null) {
                    break;
                }
            }

            if (fileUri == null) {
                call.reject("Could not create a unique file in Downloads");
                return;
            }

            try (OutputStream stream = resolver.openOutputStream(fileUri)) {
                if (stream == null) {
                    throw new Exception("Could not open the output file");
                }
                stream.write(fileBytes);
                stream.flush();
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.IS_PENDING, 0);
                resolver.update(fileUri, values, null, null);
            }

            JSObject result = new JSObject();
            result.put("uri", fileUri.toString());
            result.put("fileName", safeName);
            call.resolve(result);

        } catch (Exception e) {
            if (fileUri != null) {
                try {
                    getContext().getContentResolver().delete(
                        fileUri, null, null
                    );
                } catch (Exception ignored) {
                }
            }
            call.reject("Download failed: " + e.getMessage());
        }
    }
}
