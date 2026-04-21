package com.example.demo;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
/**
 * Service gửi email qua JavaMailSender.
 */
public class EmailService {

    private final JavaMailSender mailSender;


    @Value("${spring.mail.username}")
    private String fromEmail;

    /**
     * Gửi email văn bản đơn giản.
     *
     * Input:
     * - to: địa chỉ email nhận.
     * - subject: tiêu đề email.
     * - content: nội dung email.
     *
     * Output:
     * - Không trả về giá trị; side effect là gửi mail ra SMTP server.
     */
    public void sendEmail(String to, String subject, String content) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, true); // true = isHtml
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Lỗi gửi email: " + e.getMessage(), e);
        }
    }
}