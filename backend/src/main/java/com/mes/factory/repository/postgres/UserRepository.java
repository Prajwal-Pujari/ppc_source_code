package com.mes.factory.repository.postgres;

import com.mes.factory.entity.postgres.User;
import com.mes.factory.entity.postgres.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    Optional<User> findByIdAndFactoryId(UUID id, UUID factoryId);

    boolean existsByUsername(String username);

    Page<User> findByFactoryId(UUID factoryId, Pageable pageable);

    List<User> findByFactoryIdAndIsActiveTrue(UUID factoryId);

    List<User> findByFactoryIdAndRoleAndIsActiveTrue(UUID factoryId, UserRole role);
}
