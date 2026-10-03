package com.sina.weibo;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.widget.TextView;
import java.io.*;
import java.security.MessageDigest;
import java.util.ArrayList;
import org.json.*;
public class ShareReceiver extends Activity {
 protected void onCreate(Bundle state) { super.onCreate(state); receive(getIntent()); }
 protected void onNewIntent(Intent intent) { super.onNewIntent(intent); receive(intent); }
 private void receive(Intent intent) {
  JSONObject report=new JSONObject();
  try {
   report.put("action",intent.getAction()); report.put("text",intent.getStringExtra(Intent.EXTRA_TEXT));
   ArrayList<Uri> files=intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
   if(files==null){ files=new ArrayList<>(); Uri single=intent.getParcelableExtra(Intent.EXTRA_STREAM);if(single!=null)files.add(single); }
   JSONArray images=new JSONArray();
   for(Uri uri:files){
    MessageDigest digest=MessageDigest.getInstance("SHA-256");int count=0;
    try(InputStream input=getContentResolver().openInputStream(uri)){byte[] buffer=new byte[8192];int size;while((size=input.read(buffer))!=-1){digest.update(buffer,0,size);count+=size;}}
    StringBuilder hash=new StringBuilder();for(byte value:digest.digest())hash.append(String.format("%02x",value&255));
    JSONObject image=new JSONObject();image.put("name",uri.getLastPathSegment());image.put("bytes",count);image.put("hash",hash.toString());image.put("mime",getContentResolver().getType(uri));images.put(image);
   }
   report.put("images",images);
  } catch(Exception error){try{report.put("error",error.getClass().getSimpleName());}catch(Exception ignored){}}
  try(FileOutputStream output=openFileOutput("result.json",MODE_PRIVATE)){output.write(report.toString().getBytes("UTF-8"));}catch(Exception ignored){}
  TextView text=new TextView(this);text.setText("情晓录转发验收接收器\n只接收合成测试内容，不连接网络、不发布。\n"+report.toString());setContentView(text);
 }
}