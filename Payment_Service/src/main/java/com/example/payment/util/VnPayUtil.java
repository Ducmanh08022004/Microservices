package com.example.payment.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Utility class cho VNPay:
 * - HMAC SHA512 checksum
 * - Build payment URL
 * - Validate signature từ VNPay response
 *
 * Tuân thủ chính xác theo chuẩn kỹ thuật của VNPay.
 */
public class VnPayUtil {

    private static final Logger log = LoggerFactory.getLogger(VnPayUtil.class);

    private VnPayUtil() {}

    /**
     * Tạo HMAC SHA512 hash.
     */
    public static String hmacSHA512(String key, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac.init(secretKey);
            byte[] hash = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                // Đảm bảo không bị lỗi sign-extension của byte âm (lỗi gốc khiến hash sai độ dài)
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo HMAC SHA512", e);
        }
    }

    /**
     * Build payment URL từ map params.
     * 
     * QUAN TRỌNG:
     * VNPAY yêu cầu cả hashData và Query đều PHẢI được URL Encode (mặc định dùng dấu + cho khoảng trắng).
     */
    public static String buildPaymentUrl(Map<String, String> params, String hashSecret, String payUrl) {
        // Loại bỏ params rỗng trước khi sort
        params.entrySet().removeIf(e -> e.getValue() == null || e.getValue().isEmpty());

        // Sắp xếp theo key alphabetical
        List<String> fieldNames = new ArrayList<>(params.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        try {
            Iterator<String> itr = fieldNames.iterator();
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = params.get(fieldName);
                if (fieldValue != null && fieldValue.length() > 0) {
                    
                    // VNPAY yêu cầu URL Encode bằng UTF-8
                    String encodedValue = URLEncoder.encode(fieldValue, StandardCharsets.UTF_8.toString());
                    String encodedKey = URLEncoder.encode(fieldName, StandardCharsets.UTF_8.toString());

                    // Build hash data 
                    hashData.append(encodedKey);
                    hashData.append('=');
                    hashData.append(encodedValue);

                    // Build query URL
                    query.append(encodedKey);
                    query.append('=');
                    query.append(encodedValue);

                    if (itr.hasNext()) {
                        query.append('&');
                        hashData.append('&');
                    }
                }
            }
        } catch (Exception e) {
            log.error("Lỗi khi encode tham số VNPay", e);
        }

        log.info("VNPay hashData: {}", hashData);

        String secureHash = hmacSHA512(hashSecret, hashData.toString());
        log.info("VNPay secureHash: {}", secureHash);

        query.append("&vnp_SecureHash=").append(secureHash);

        return payUrl + "?" + query;
    }

    /**
     * Validate signature từ VNPay response (IPN hoặc ReturnURL).
     */
    public static boolean validateSignature(Map<String, String> params, String hashSecret) {
        String vnpSecureHash = params.get("vnp_SecureHash");
        if (vnpSecureHash == null || vnpSecureHash.isEmpty()) {
            return false;
        }

        // Copy params, loại bỏ vnp_SecureHash và vnp_SecureHashType
        Map<String, String> filtered = new HashMap<>(params);
        filtered.remove("vnp_SecureHash");
        filtered.remove("vnp_SecureHashType");

        // Sắp xếp theo key alphabetical
        List<String> fieldNames = new ArrayList<>(filtered.keySet());
        Collections.sort(fieldNames);

        // Lọc bỏ params rỗng
        fieldNames.removeIf(name -> {
            String val = filtered.get(name);
            return val == null || val.isEmpty();
        });

        StringBuilder hashData = new StringBuilder();
        try {
            Iterator<String> itr = fieldNames.iterator();
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = filtered.get(fieldName);
                
                String encodedValue = URLEncoder.encode(fieldValue, StandardCharsets.UTF_8.toString());
                String encodedKey = URLEncoder.encode(fieldName, StandardCharsets.UTF_8.toString());
                
                hashData.append(encodedKey);
                hashData.append('=');
                hashData.append(encodedValue);
                
                if (itr.hasNext()) {
                    hashData.append('&');
                }
            }
        } catch (Exception e) {
            log.error("Lỗi khi encode tham số VNPay IPN", e);
        }

        log.info("VNPay validate hashData: {}", hashData);
        log.info("VNPay received secureHash: {}", vnpSecureHash);

        String calculatedHash = hmacSHA512(hashSecret, hashData.toString());
        log.info("VNPay calculated hash: {}", calculatedHash);

        return calculatedHash.equalsIgnoreCase(vnpSecureHash);
    }

    /**
     * Sinh chuỗi số ngẫu nhiên với độ dài chỉ định.
     */
    public static String getRandomNumber(int length) {
        Random rnd = new Random();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(rnd.nextInt(10));
        }
        return sb.toString();
    }
}
