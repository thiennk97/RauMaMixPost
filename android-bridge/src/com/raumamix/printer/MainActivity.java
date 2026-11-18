package com.raumamix.printer;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.nio.charset.StandardCharsets;
import java.util.List;

public class MainActivity extends Activity {
    private TextView statusView;

    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (UsbHelper.ACTION_USB_PERMISSION.equals(intent.getAction())) {
                refreshStatus();
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent svc = new Intent(this, BridgeService.class);
        if (Build.VERSION.SDK_INT >= 26) {
            startForegroundService(svc);
        } else {
            startService(svc);
        }

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(40, 40, 40, 40);

        TextView title = new TextView(this);
        title.setText("Raumamix USB Printer Bridge");
        title.setTextSize(20f);
        layout.addView(title);

        statusView = new TextView(this);
        statusView.setPadding(0, 20, 0, 24);
        statusView.setTextSize(15f);
        layout.addView(statusView);

        Button btnPick = new Button(this);
        btnPick.setText("1. Cap quyen May in USB");
        btnPick.setOnClickListener(v -> pickAndRequest());
        layout.addView(btnPick);

        Button btnTest = new Button(this);
        btnTest.setText("2. In thu 1 dong len may in");
        btnTest.setOnClickListener(v -> testPrint());
        layout.addView(btnTest);

        setContentView(layout);

        IntentFilter filter = new IntentFilter(UsbHelper.ACTION_USB_PERMISSION);
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(usbReceiver, filter);
        }
        refreshStatus();
    }

    private void pickAndRequest() {
        List<UsbDevice> list = UsbHelper.listDevices(this);
        if (list.isEmpty()) {
            Toast.makeText(this, "Khong thay thiet bi USB nao", Toast.LENGTH_SHORT).show();
            return;
        }
        UsbDevice target = UsbHelper.findPrinterDevice(this);
        if (target == null) target = list.get(0);
        UsbHelper.setSelectedDevice(target);
        UsbHelper.requestPermission(this, target);
        refreshStatus();
    }

    private void testPrint() {
        new Thread(() -> {
            try {
                byte[] cmd = ("\u001B@RAU MA MIX - TEST OK\n\n\n").getBytes(StandardCharsets.UTF_8);
                UsbHelper.sendBytes(this, cmd);
                runOnUiThread(() -> Toast.makeText(this, "Da gui lenh in!", Toast.LENGTH_SHORT).show());
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Loi: " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private void refreshStatus() {
        UsbManager mgr = (UsbManager) getSystemService(Context.USB_SERVICE);
        List<UsbDevice> list = UsbHelper.listDevices(this);
        StringBuilder sb = new StringBuilder();
        sb.append("Cong HTTP: http://127.0.0.1:9191\n");
        sb.append("Thiet bi USB tim thay (").append(list.size()).append("):\n");
        for (UsbDevice d : list) {
            boolean perm = mgr != null && mgr.hasPermission(d);
            sb.append("- ")
              .append(d.getProductName() != null ? d.getProductName() : d.getDeviceName())
              .append(" [VID:").append(d.getVendorId()).append("] ")
              .append(perm ? "(Da cap quyen)" : "(Chua cap quyen)")
              .append("\n");
        }
        statusView.setText(sb.toString());
    }

    @Override
    protected void onDestroy() {
        try { unregisterReceiver(usbReceiver); } catch (Exception ignored) {}
        super.onDestroy();
    }
}
