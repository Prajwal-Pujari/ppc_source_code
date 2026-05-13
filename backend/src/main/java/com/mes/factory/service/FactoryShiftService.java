package com.mes.factory.service;

import com.mes.factory.dto.request.CreateShiftRequest;
import com.mes.factory.entity.postgres.FactoryShift;
import com.mes.factory.entity.postgres.User;
import com.mes.factory.exception.ResourceNotFoundException;
import com.mes.factory.repository.postgres.FactoryShiftRepository;
import com.mes.factory.repository.postgres.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class FactoryShiftService {

    private final FactoryShiftRepository factoryShiftRepository;
    private final UserRepository userRepository;

    public FactoryShiftService(FactoryShiftRepository factoryShiftRepository, UserRepository userRepository) {
        this.factoryShiftRepository = factoryShiftRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<FactoryShift> getAllActiveByFactory(UUID factoryId) {
        return factoryShiftRepository.findByFactoryIdAndIsActiveTrue(factoryId);
    }

    @Transactional(readOnly = true)
    public FactoryShift getById(UUID id) {
        return factoryShiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FactoryShift", "id", id));
    }

    @Transactional
    public FactoryShift create(UUID userId, CreateShiftRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        FactoryShift shift = FactoryShift.builder()
                .factory(user.getFactory())
                .shiftName(request.getShiftName())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .isActive(true)
                .build();

        return factoryShiftRepository.save(shift);
    }

    @Transactional
    public FactoryShift update(UUID shiftId, CreateShiftRequest request) {
        FactoryShift shift = getById(shiftId);
        shift.setShiftName(request.getShiftName());
        shift.setStartTime(request.getStartTime());
        shift.setEndTime(request.getEndTime());
        return factoryShiftRepository.save(shift);
    }

    @Transactional
    public void delete(UUID shiftId) {
        FactoryShift shift = getById(shiftId);
        shift.setIsActive(false);
        factoryShiftRepository.save(shift);
    }

    /**
     * Determines the active shift for a given factory based on the provided time.
     * Handles shifts that span across midnight.
     */
    @Transactional(readOnly = true)
    public Optional<FactoryShift> getCurrentShift(UUID factoryId, LocalTime currentTime) {
        List<FactoryShift> shifts = getAllActiveByFactory(factoryId);

        return shifts.stream()
                .filter(shift -> {
                    LocalTime start = shift.getStartTime();
                    LocalTime end = shift.getEndTime();

                    if (start.isBefore(end)) {
                        // Normal shift: start < end (e.g., 08:00 to 16:00)
                        return !currentTime.isBefore(start) && !currentTime.isAfter(end);
                    } else {
                        // Night shift crossing midnight: start > end (e.g., 22:00 to 06:00)
                        return !currentTime.isBefore(start) || !currentTime.isAfter(end);
                    }
                })
                .findFirst();
    }
}
