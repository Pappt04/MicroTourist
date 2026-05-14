package com.microtourist.followers.controller;

import com.microtourist.followers.service.FollowService;
import com.microtourist.followers.util.TokenUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin
public class FollowController {

    private final FollowService followService;
    private final TokenUtil tokenUtil;

    public FollowController(FollowService followService, TokenUtil tokenUtil) {
        this.followService = followService;
        this.tokenUtil = tokenUtil;
    }

    private TokenUtil.TokenPayload auth(HttpServletRequest req) {
        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return null;
        return tokenUtil.validateToken(header.substring(7));
    }

    @PostMapping("/follow/{targetUserId}")
    public ResponseEntity<?> follow(
            @PathVariable Long targetUserId,
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        if (user.userId().equals(targetUserId)) return ResponseEntity.badRequest().body(Map.of("error", "cannot follow yourself"));

        String targetUsername = body != null ? (String) body.getOrDefault("username", "") : "";
        followService.follow(user.userId(), user.username(), targetUserId, targetUsername);
        return ResponseEntity.ok(Map.of("message", "followed"));
    }

    @DeleteMapping("/follow/{targetUserId}")
    public ResponseEntity<?> unfollow(@PathVariable Long targetUserId, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));

        followService.unfollow(user.userId(), targetUserId);
        return ResponseEntity.ok(Map.of("message", "unfollowed"));
    }

    @GetMapping("/following/{userId}")
    public ResponseEntity<?> getFollowing(@PathVariable Long userId) {
        return ResponseEntity.ok(followService.getFollowing(userId));
    }

    @GetMapping("/followers/{userId}")
    public ResponseEntity<?> getFollowers(@PathVariable Long userId) {
        return ResponseEntity.ok(followService.getFollowers(userId));
    }

    @GetMapping("/is-following/{targetUserId}")
    public ResponseEntity<?> isFollowing(@PathVariable Long targetUserId, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));

        boolean result = followService.isFollowing(user.userId(), targetUserId);
        return ResponseEntity.ok(Map.of("isFollowing", result));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<?> recommendations(HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));

        return ResponseEntity.ok(followService.getRecommendations(user.userId()));
    }

    @GetMapping("/feed-authors")
    public ResponseEntity<?> feedAuthors(HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));

        return ResponseEntity.ok(Map.of("authorIds", followService.getFollowingIds(user.userId())));
    }
}
