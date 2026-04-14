package com.example.demo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByUsername(String username);
    Page<User> findAll(Pageable pageable);

    @Query("SELECT u FROM User u WHERE " +
           "(:query IS NULL OR u.username LIKE %:query% OR u.email LIKE %:query%) AND " +
           "(:role IS NULL OR u.role = :role) AND " +
           "(:isEnabled IS NULL OR u.isEnabled = :isEnabled)")
    Page<User> searchUsers(@Param("query") String query, 
                           @Param("role") String role, 
                           @Param("isEnabled") Boolean isEnabled, 
                           Pageable pageable);
    
    long count();
}
