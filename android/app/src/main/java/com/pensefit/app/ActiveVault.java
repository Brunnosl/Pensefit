package com.pensefit.app;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class ActiveVault {
 private final Context context;
 ActiveVault(Context context){this.context=context.getApplicationContext();}
 private String tag(String account)throws Exception{if(!account.matches("[a-fA-F0-9-]{36}"))throw new SecurityException("Conta inválida");byte[] bytes=MessageDigest.getInstance("SHA-256").digest(account.getBytes(StandardCharsets.UTF_8));StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format("%02x",b));return "pf-active-"+s;}
 private SecretKey key(String account)throws Exception{String alias=tag(account);KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias(alias)){KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");generator.init(new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());generator.generateKey();}return (SecretKey)ks.getKey(alias,null);}
 private File file(String account,String name)throws Exception{if(!name.matches("[a-z-]{1,40}"))throw new SecurityException("Nome inválido");File dir=new File(context.getNoBackupFilesDir(),"pense-active");if(!dir.exists()&&!dir.mkdirs())throw new IllegalStateException("Armazenamento indisponível");return new File(dir,tag(account)+"-"+name+".bin");}
 synchronized void write(String account,String name,String value)throws Exception{Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key(account));cipher.updateAAD((account+":"+name).getBytes(StandardCharsets.UTF_8));byte[] encrypted=cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)),iv=cipher.getIV(),out=new byte[iv.length+encrypted.length];System.arraycopy(iv,0,out,0,iv.length);System.arraycopy(encrypted,0,out,iv.length,encrypted.length);File target=file(account,name),temp=new File(target.getPath()+".tmp");try(java.io.FileOutputStream stream=new java.io.FileOutputStream(temp)){stream.write(out);stream.getFD().sync();}if(!temp.renameTo(target))throw new IllegalStateException("Não foi possível salvar");}
 synchronized String read(String account,String name)throws Exception{File target=file(account,name);if(!target.exists())return null;byte[] bytes;try(java.io.FileInputStream input=new java.io.FileInputStream(target);java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream()){byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1)out.write(buffer,0,count);bytes=out.toByteArray();}if(bytes.length<28)throw new SecurityException("Dados inválidos");Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(account),new GCMParameterSpec(128,Arrays.copyOfRange(bytes,0,12)));cipher.updateAAD((account+":"+name).getBytes(StandardCharsets.UTF_8));return new String(cipher.doFinal(Arrays.copyOfRange(bytes,12,bytes.length)),StandardCharsets.UTF_8);}
 synchronized void remove(String account,String name)throws Exception{File f=file(account,name);if(f.exists()&&!f.delete())throw new IllegalStateException("Não foi possível excluir");}
}
