package com.qingxiaolu.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.UUID;

@CapacitorPlugin(name = "WritingFiles")
public class WritingFilesPlugin extends Plugin {
    private static final class Prepared {
        File file; String name; String mime;
        Prepared(File file, String name, String mime) { this.file = file; this.name = name; this.mime = mime; }
    }
    private final HashMap<String, Prepared> prepared = new HashMap<>();
    private boolean saving = false;

    @PluginMethod
    public void stage(PluginCall call) {
        File output = null;
        try {
            String name = call.getString("name", "情晓录导出");
            String mime = call.getString("mime", "");
            if (!mime.equals("image/png") && !mime.equals("application/zip") && !mime.equals("application/json"))
                throw new IllegalArgumentException("不支持此导出文件类型");
            String encoded = call.getString("base64", "");
            if (encoded.length() > 128 * 1024 * 1024) throw new IllegalArgumentException("导出文件过大，请分项目备份或分批分享");
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            if (bytes.length == 0) throw new IllegalArgumentException("导出内容为空");
            if (mime.equals("image/png") && (bytes.length < 8 || bytes[0] != (byte) 137 || bytes[1] != 80 || bytes[2] != 78 || bytes[3] != 71))
                throw new IllegalArgumentException("分享图片不是有效 PNG");
            File folder = new File(getContext().getCacheDir(), "writing-exports");
            if (!folder.isDirectory() && !folder.mkdirs()) throw new IllegalStateException("无法准备导出目录，请检查存储空间");
            // 只清理本插件一天前的临时文件，不处理原稿或已保存的系统文件。
            File[] old = folder.listFiles();
            if (old != null) for (File file : old) if (file.isFile() && file.lastModified() < System.currentTimeMillis() - 86400000L) file.delete();
            String extension = mime.equals("image/png") ? ".png" : mime.equals("application/zip") ? ".zip" : ".json";
            output = File.createTempFile("export-", extension, folder);
            try (FileOutputStream stream = new FileOutputStream(output)) { stream.write(bytes); }
            String token = UUID.randomUUID().toString();
            name = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
            if (name.isEmpty()) name = "情晓录导出" + extension;
            prepared.put(token, new Prepared(output, name, mime));
            JSObject result = new JSObject(); result.put("token", token); call.resolve(result);
        } catch (Exception error) { if (output != null) output.delete(); call.reject(error.getMessage()); }
    }

    private Prepared get(String token) {
        Prepared value = prepared.get(token);
        if (value == null || !value.file.isFile()) throw new IllegalArgumentException("导出文件已失效，请重新生成");
        return value;
    }

    @PluginMethod
    public void shareImages(PluginCall call) {
        try {
            JSArray tokens = call.getArray("tokens", new JSArray());
            if (tokens.length() == 0) throw new IllegalArgumentException("请先生成分享图片");
            ArrayList<Uri> uris = new ArrayList<>();
            for (int i = 0; i < tokens.length(); i++) {
                Prepared value = get(tokens.getString(i));
                if (!value.mime.equals("image/png")) throw new IllegalArgumentException("只能从此入口分享 PNG 图片");
                uris.add(FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", value.file));
            }
            Intent intent = new Intent(uris.size() == 1 ? Intent.ACTION_SEND : Intent.ACTION_SEND_MULTIPLE);
            intent.setType("image/png"); intent.putExtra(Intent.EXTRA_SUBJECT, call.getString("title", "情晓录"));
            if (uris.size() == 1) intent.putExtra(Intent.EXTRA_STREAM, uris.get(0));
            else intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
            ClipData clip = ClipData.newUri(getContext().getContentResolver(), "情晓录分享图片", uris.get(0));
            for (int i = 1; i < uris.size(); i++) clip.addItem(new ClipData.Item(uris.get(i)));
            intent.setClipData(clip); intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(intent, "分享记录图片"));
            JSObject result = new JSObject(); result.put("opened", true); call.resolve(result);
        } catch (Exception error) { call.reject(error.getMessage()); }
    }

    @PluginMethod
    public void save(PluginCall call) {
        if (saving) { call.reject("已有文件正在保存，请先完成或取消系统保存窗口"); return; }
        try {
            Prepared value = get(call.getString("token", ""));
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE); intent.setType(value.mime);
            intent.putExtra(Intent.EXTRA_TITLE, value.name);
            saving = true; startActivityForResult(call, intent, "savedDocument");
        } catch (Exception error) { saving = false; call.reject(error.getMessage()); }
    }

    @ActivityCallback
    private void savedDocument(PluginCall call, ActivityResult result) {
        saving = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject value = new JSObject(); value.put("saved", false); call.resolve(value); return;
        }
        try {
            Prepared source = get(call.getString("token", ""));
            Uri target = result.getData().getData();
            try (FileInputStream input = new FileInputStream(source.file); OutputStream output = getContext().getContentResolver().openOutputStream(target, "wt")) {
                if (output == null) throw new IllegalStateException("无法写入所选位置");
                byte[] buffer = new byte[8192]; int size;
                while ((size = input.read(buffer)) != -1) output.write(buffer, 0, size);
            }
            JSObject value = new JSObject(); value.put("saved", true); call.resolve(value);
        } catch (Exception error) { call.reject("文件保存未完成，请检查存储空间或更换位置；原稿仍保留。" ); }
    }
}
