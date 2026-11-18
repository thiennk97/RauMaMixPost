package com.raumamix.printer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.hardware.usb.UsbDevice;
import android.os.Build;
import android.os.IBinder;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class BridgeService extends Service {
    public static final int PORT = 9191;
    private volatile boolean running = false;
    private ServerSocket serverSocket;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForegroundCompat();
        if (!running) {
            running = true;
            new Thread(this::runServer, "RaumamixHttpBridge").start();
        }
        return START_STICKY;
    }

    private void startForegroundCompat() {
        String channelId = "raumamix_printer";
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(
                channelId,
                "Raumamix Printer Bridge",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
            Notification n = new Notification.Builder(this, channelId)
                .setContentTitle("Raumamix Printer")
                .setContentText("Dang chay cong in 127.0.0.1:9191")
                .setSmallIcon(android.R.drawable.ic_menu_send)
                .build();
            startForeground(1, n);
        }
    }

    private void runServer() {
        try {
            serverSocket = new ServerSocket(PORT, 16, InetAddress.getByName("127.0.0.1"));
            while (running) {
                Socket client = serverSocket.accept();
                new Thread(() -> handleClient(client)).start();
            }
        } catch (Exception ignored) {}
    }

    private void handleClient(Socket client) {
        try (Socket s = client) {
            InputStream rawIn = new BufferedInputStream(s.getInputStream());
            OutputStream out = s.getOutputStream();

            String requestLine = readLine(rawIn);
            if (requestLine == null || requestLine.isEmpty()) return;

            int contentLength = 0;
            String line;
            while ((line = readLine(rawIn)) != null && !line.isEmpty()) {
                String lower = line.toLowerCase();
                if (lower.startsWith("content-length:")) {
                    contentLength = Integer.parseInt(lower.substring(15).trim());
                }
            }

            if (requestLine.startsWith("OPTIONS ")) {
                writeResponse(out, 204, "text/plain", new byte[0]);
                return;
            }

            if (requestLine.startsWith("GET /status")) {
                UsbDevice dev = UsbHelper.findPrinterDevice(this);
                String name = dev != null ? (dev.getProductName() != null ? dev.getProductName() : dev.getDeviceName()) : "";
                String json = "{\"ok\":true,\"printer\":\"" + name.replace("\"", "") + "\"}";
                writeResponse(out, 200, "application/json", json.getBytes(StandardCharsets.UTF_8));
                return;
            }

            if (requestLine.startsWith("POST /print")) {
                byte[] body = new byte[contentLength];
                int read = 0;
                while (read < contentLength) {
                    int n = rawIn.read(body, read, contentLength - read);
                    if (n < 0) break;
                    read += n;
                }
                try {
                    UsbHelper.sendBytes(this, body);
                    writeResponse(out, 200, "application/json", "{\"ok\":true}".getBytes(StandardCharsets.UTF_8));
                } catch (Exception ex) {
                    String err = "{\"ok\":false,\"error\":\"" + String.valueOf(ex.getMessage()).replace("\"", "'") + "\"}";
                    writeResponse(out, 500, "application/json", err.getBytes(StandardCharsets.UTF_8));
                }
                return;
            }

            writeResponse(out, 404, "text/plain", "Not Found".getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {}
    }

    private String readLine(InputStream in) throws Exception {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        int b;
        while ((b = in.read()) != -1) {
            if (b == '\n') break;
            if (b != '\r') buf.write(b);
        }
        if (b == -1 && buf.size() == 0) return null;
        return buf.toString("UTF-8");
    }

    private void writeResponse(OutputStream out, int code, String contentType, byte[] body) throws Exception {
        String status = code == 200 ? "200 OK" : code == 204 ? "204 No Content" : code == 500 ? "500 Error" : "404 Not Found";
        String headers =
            "HTTP/1.1 " + status + "\r\n" +
            "Content-Type: " + contentType + "\r\n" +
            "Content-Length: " + body.length + "\r\n" +
            "Access-Control-Allow-Origin: *\r\n" +
            "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
            "Access-Control-Allow-Headers: Content-Type\r\n" +
            "Access-Control-Allow-Private-Network: true\r\n" +
            "Connection: close\r\n\r\n";
        out.write(headers.getBytes(StandardCharsets.UTF_8));
        if (body.length > 0) out.write(body);
        out.flush();
    }

    @Override
    public void onDestroy() {
        running = false;
        try { if (serverSocket != null) serverSocket.close(); } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
