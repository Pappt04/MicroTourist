package com.microtourist.followers.service;

import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FollowService {

    private final Neo4jClient neo4jClient;

    public FollowService(Neo4jClient neo4jClient) {
        this.neo4jClient = neo4jClient;
    }

    private void ensureUser(Long userId, String username) {
        neo4jClient.query(
            "MERGE (u:User {userId: $userId}) " +
            "ON CREATE SET u.username = $username " +
            "ON MATCH SET u.username = CASE WHEN $username <> '' THEN $username ELSE u.username END"
        ).bind(userId).to("userId")
         .bind(username != null ? username : "").to("username")
         .run();
    }

    public void follow(Long followerId, String followerUsername, Long followeeId, String followeeUsername) {
        ensureUser(followerId, followerUsername);
        ensureUser(followeeId, followeeUsername != null ? followeeUsername : "");
        neo4jClient.query(
            "MATCH (a:User {userId: $followerId}), (b:User {userId: $followeeId}) " +
            "MERGE (a)-[:FOLLOWS]->(b)"
        ).bind(followerId).to("followerId")
         .bind(followeeId).to("followeeId")
         .run();
    }

    public void unfollow(Long followerId, Long followeeId) {
        neo4jClient.query(
            "MATCH (a:User {userId: $followerId})-[r:FOLLOWS]->(b:User {userId: $followeeId}) DELETE r"
        ).bind(followerId).to("followerId")
         .bind(followeeId).to("followeeId")
         .run();
    }

    public boolean isFollowing(Long followerId, Long followeeId) {
        return neo4jClient.query(
            "MATCH (a:User {userId: $followerId})-[:FOLLOWS]->(b:User {userId: $followeeId}) " +
            "RETURN count(*) > 0 AS exists"
        ).bind(followerId).to("followerId")
         .bind(followeeId).to("followeeId")
         .fetch()
         .one()
         .map(m -> (Boolean) m.get("exists"))
         .orElse(false);
    }

    public List<Map<String, Object>> getFollowing(Long userId) {
        Collection<Map<String, Object>> rows = neo4jClient.query(
            "MATCH (u:User {userId: $userId})-[:FOLLOWS]->(v:User) " +
            "RETURN v.userId AS userId, v.username AS username"
        ).bind(userId).to("userId")
         .fetch().all();
        return rows.stream()
            .map(m -> Map.<String, Object>of("userId", m.get("userId"), "username", m.get("username")))
            .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getFollowers(Long userId) {
        Collection<Map<String, Object>> rows = neo4jClient.query(
            "MATCH (u:User)-[:FOLLOWS]->(v:User {userId: $userId}) " +
            "RETURN u.userId AS userId, u.username AS username"
        ).bind(userId).to("userId")
         .fetch().all();
        return rows.stream()
            .map(m -> Map.<String, Object>of("userId", m.get("userId"), "username", m.get("username")))
            .collect(Collectors.toList());
    }

    public List<Long> getFollowingIds(Long userId) {
        Collection<Map<String, Object>> rows = neo4jClient.query(
            "MATCH (u:User {userId: $userId})-[:FOLLOWS]->(v:User) RETURN v.userId AS userId"
        ).bind(userId).to("userId")
         .fetch().all();
        return rows.stream()
            .map(m -> (Long) m.get("userId"))
            .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getRecommendations(Long userId) {
        Collection<Map<String, Object>> rows = neo4jClient.query(
            "MATCH (u:User {userId: $userId})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(rec:User) " +
            "WHERE rec.userId <> $userId AND NOT (u)-[:FOLLOWS]->(rec) " +
            "RETURN rec.userId AS userId, rec.username AS username, count(*) AS score " +
            "ORDER BY score DESC LIMIT 10"
        ).bind(userId).to("userId")
         .fetch().all();
        return rows.stream()
            .map(m -> Map.<String, Object>of(
                "userId", m.get("userId"),
                "username", m.get("username"),
                "score", m.get("score")
            ))
            .collect(Collectors.toList());
    }
}
