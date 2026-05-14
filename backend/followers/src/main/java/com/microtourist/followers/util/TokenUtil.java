package com.microtourist.followers.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

@Component
public class TokenUtil {

    @Value("${token.secret:change-me-in-production}")
    private String secret;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public record TokenPayload(Long userId, String username, String role) {}

    public TokenPayload validateToken(String token) {
        String[] parts = token.split("\\.", 2);
        if (parts.length != 2) return null;

        String encoded = parts[0];
        String sig = parts[1];

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(encoded.getBytes(StandardCharsets.UTF_8));
            String expectedSig = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);

            if (!expectedSig.equals(sig)) return null;

            byte[] data = Base64.getUrlDecoder().decode(encoded);
            JsonNode json = objectMapper.readTree(data);

            long exp = json.get("exp").asLong();
            if (Instant.now().getEpochSecond() > exp) return null;

            return new TokenPayload(
                json.get("uid").asLong(),
                json.get("usr").asText(),
                json.get("role").asText()
            );
        } catch (Exception e) {
            return null;
        }
    }
}
