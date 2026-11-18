package com.raumamix.printer;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class UsbHelper {
    public static final String ACTION_USB_PERMISSION = "com.raumamix.printer.USB_PERMISSION";
    private static int selectedDeviceId = -1;

    public static List<UsbDevice> listDevices(Context ctx) {
        UsbManager mgr = (UsbManager) ctx.getSystemService(Context.USB_SERVICE);
        List<UsbDevice> out = new ArrayList<>();
        if (mgr == null) return out;
        Map<String, UsbDevice> map = mgr.getDeviceList();
        for (UsbDevice d : map.values()) {
            out.add(d);
        }
        return out;
    }

    public static void setSelectedDevice(UsbDevice dev) {
        selectedDeviceId = dev != null ? dev.getDeviceId() : -1;
    }

    public static UsbDevice findPrinterDevice(Context ctx) {
        List<UsbDevice> devices = listDevices(ctx);
        if (selectedDeviceId != -1) {
            for (UsbDevice d : devices) {
                if (d.getDeviceId() == selectedDeviceId) return d;
            }
        }
        for (UsbDevice d : devices) {
            for (int i = 0; i < d.getInterfaceCount(); i++) {
                if (d.getInterface(i).getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                    return d;
                }
            }
        }
        for (UsbDevice d : devices) {
            if (findOutEndpoint(d) != null) return d;
        }
        return null;
    }

    public static void requestPermission(Context ctx, UsbDevice dev) {
        UsbManager mgr = (UsbManager) ctx.getSystemService(Context.USB_SERVICE);
        if (mgr == null || dev == null) return;
        PendingIntent pi = PendingIntent.getBroadcast(
            ctx,
            0,
            new Intent(ACTION_USB_PERMISSION),
            PendingIntent.FLAG_IMMUTABLE
        );
        mgr.requestPermission(dev, pi);
    }

    public static class EndpointInfo {
        public UsbInterface iface;
        public UsbEndpoint outEp;
    }

    public static EndpointInfo findOutEndpoint(UsbDevice dev) {
        for (int i = 0; i < dev.getInterfaceCount(); i++) {
            UsbInterface iface = dev.getInterface(i);
            for (int j = 0; j < iface.getEndpointCount(); j++) {
                UsbEndpoint ep = iface.getEndpoint(j);
                if (ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                    EndpointInfo info = new EndpointInfo();
                    info.iface = iface;
                    info.outEp = ep;
                    return info;
                }
            }
        }
        return null;
    }

    public static synchronized void sendBytes(Context ctx, byte[] data) throws Exception {
        UsbManager mgr = (UsbManager) ctx.getSystemService(Context.USB_SERVICE);
        if (mgr == null) throw new Exception("No UsbManager");
        UsbDevice dev = findPrinterDevice(ctx);
        if (dev == null) throw new Exception("Chua tim thay may in USB");
        if (!mgr.hasPermission(dev)) {
            requestPermission(ctx, dev);
            throw new Exception("Chua cap quyen USB cho may in");
        }
        EndpointInfo epInfo = findOutEndpoint(dev);
        if (epInfo == null) throw new Exception("Khong co cong OUT tren thiet bi USB");

        UsbDeviceConnection conn = mgr.openDevice(dev);
        if (conn == null) throw new Exception("Khong mo duoc ket noi USB");
        try {
            if (!conn.claimInterface(epInfo.iface, true)) {
                throw new Exception("Khong claimInterface duoc USB");
            }
            int offset = 0;
            int chunkSize = 2048;
            while (offset < data.length) {
                int len = Math.min(chunkSize, data.length - offset);
                byte[] slice = new byte[len];
                System.arraycopy(data, offset, slice, 0, len);
                int written = conn.bulkTransfer(epInfo.outEp, slice, len, 5000);
                if (written < 0) {
                    throw new Exception("Loi ghi USB bulkTransfer");
                }
                offset += len;
            }
        } finally {
            try { conn.releaseInterface(epInfo.iface); } catch (Exception ignored) {}
            try { conn.close(); } catch (Exception ignored) {}
        }
    }
}
