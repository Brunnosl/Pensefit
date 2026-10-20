package com.pensefit.app;
import android.Manifest;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.JSONObject;

@CapacitorPlugin(name="PenseActive",permissions={@Permission(alias="location",strings={Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION}),@Permission(alias="notifications",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class PenseActivePlugin extends Plugin {
 static PenseActivePlugin current;
 private String account="";
 private ActiveVault vault;
 public void load(){current=this;vault=new ActiveVault(getContext());}
 static void emit(String name,JSONObject data){if(current!=null)try{current.notifyListeners(name,JSObject.fromJSONObject(data),true);}catch(Exception ignored){}}
 private void owner(PluginCall call)throws Exception{if(account.isEmpty()||!account.equals(call.getString("account",account)))throw new SecurityException("Conta não autorizada");}
 @PluginMethod public void bindAccount(PluginCall call){String next=call.getString("account","");if(!next.equals(account))getContext().stopService(new Intent(getContext(),ActiveService.class));account=next;call.resolve();}
 @PluginMethod public void secureRead(PluginCall call){try{owner(call);String value=vault.read(account,call.getString("key","offline"));JSObject r=new JSObject();r.put("value",value==null?JSONObject.NULL:value);call.resolve(r);}catch(Exception e){call.reject("Não foi possível abrir o armazenamento protegido");}}
 @PluginMethod public void secureWrite(PluginCall call){try{owner(call);vault.write(account,call.getString("key","offline"),call.getString("value",""));call.resolve();}catch(Exception e){call.reject("Não foi possível salvar no armazenamento protegido");}}
 @PluginMethod public void secureRemove(PluginCall call){try{owner(call);vault.remove(account,call.getString("key","offline"));call.resolve();}catch(Exception e){call.reject("Não foi possível excluir do armazenamento protegido");}}
 @PluginMethod public void startRun(PluginCall call){try{owner(call);if(!Boolean.TRUE.equals(call.getBoolean("consent",false))){call.reject("Autorize a localização");return;}if(getPermissionState("location")!=PermissionState.GRANTED){requestPermissionForAlias("location",call,"locationResult");return;}if(Build.VERSION.SDK_INT>=33&&getPermissionState("notifications")!=PermissionState.GRANTED){requestPermissionForAlias("notifications",call,"notificationResult");return;}launchRun(call);}catch(Exception e){call.reject("Não foi possível iniciar o serviço de corrida");}}
 @PermissionCallback private void locationResult(PluginCall call){if(getPermissionState("location")!=PermissionState.GRANTED){call.reject("Permissão de localização negada");return;}startRun(call);}
 @PermissionCallback private void notificationResult(PluginCall call){if(getPermissionState("notifications")!=PermissionState.GRANTED){call.reject("Autorize as notificações da atividade");return;}launchRun(call);}
 private void launchRun(PluginCall call){Intent intent=new Intent(getContext(),ActiveService.class).setAction("run-start").putExtra("account",account).putExtra("options",call.getData().toString());try{androidx.core.content.ContextCompat.startForegroundService(getContext(),intent);call.resolve();}catch(Exception e){call.reject("Abra o app e inicie a corrida com as permissões concedidas");}}
 @PluginMethod public void stopRun(PluginCall call){new android.os.Handler(android.os.Looper.getMainLooper()).post(()->{try{JSObject result=new JSObject();if(ActiveService.instance!=null)result.put("data",ActiveService.instance.stopFromBridge());else{String saved=vault.read(account,"run");result.put("data",saved==null?JSONObject.NULL:new JSONObject(saved));}call.resolve(result);}catch(Exception e){call.reject("Não foi possível pausar a corrida");}});}
 @PluginMethod public void saveRun(PluginCall call){try{owner(call);vault.write(account,"run",call.getObject("data").toString());call.resolve();}catch(Exception e){call.reject("Falha ao salvar corrida privada");}}
 @PluginMethod public void readRun(PluginCall call){try{owner(call);String saved=vault.read(account,"run");JSObject r=new JSObject();r.put("data",saved==null?JSONObject.NULL:new JSONObject(saved));call.resolve(r);}catch(Exception e){call.reject("Falha ao recuperar corrida privada");}}
 @PluginMethod public void setTimer(PluginCall call){try{owner(call);Intent i=new Intent(getContext(),ActiveService.class).setAction("timer").putExtra("account",account).putExtra("options",call.getData().toString());androidx.core.content.ContextCompat.startForegroundService(getContext(),i);call.resolve();}catch(Exception e){call.reject("Não foi possível iniciar os alertas nativos");}}
 @PluginMethod public void stopTimer(PluginCall call){getContext().startService(new Intent(getContext(),ActiveService.class).setAction("timer-stop").putExtra("kind",call.getString("kind")));call.resolve();}
 @PluginMethod public void speak(PluginCall call){try{owner(call);if(ActiveService.instance!=null)ActiveService.instance.say(call.getString("text",""),call.getDouble("volume",.8).floatValue(),call.getDouble("rate",1.).floatValue());else androidx.core.content.ContextCompat.startForegroundService(getContext(),new Intent(getContext(),ActiveService.class).setAction("speak").putExtra("account",account).putExtra("options",call.getData().toString()));call.resolve();}catch(Exception e){call.reject("Voz nativa indisponível");}}
 @PluginMethod public void stopAll(PluginCall call){getContext().stopService(new Intent(getContext(),ActiveService.class));call.resolve();}
 @Override protected void handleOnDestroy(){if(current==this)current=null;}
}
