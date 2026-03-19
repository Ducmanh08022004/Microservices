package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
/**
 * Repository truy cập dữ liệu user.
 */
public interface UserRepository  extends JpaRepository<User,Integer> {

     /**
      * Tìm user theo username.
      */
     Optional<User> findByUsername(String username);
}
