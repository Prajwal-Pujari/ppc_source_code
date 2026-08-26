"""
IGS (IGES) File Parser — Extracts circular arc entities (Type 100)
to identify hole centers, radii, and positions from the 3D model.
"""
import re
from dataclasses import dataclass


@dataclass
class CircularArc:
    """Represents a circular arc from the IGES file (Entity Type 100)."""
    entity_id: int
    center_x: float
    center_y: float
    center_z: float  # Z-plane offset
    radius: float
    start_angle: float
    end_angle: float
    is_full_circle: bool


@dataclass
class HoleFeature:
    """A detected hole from the 3D model geometry."""
    hole_id: int
    center_x: float
    center_y: float
    center_z: float
    radius: float
    diameter: float
    group: str  # 'threaded_m6', 'through_hole', 'flange_hole'


def parse_igs_file(filepath: str) -> list[CircularArc]:
    """
    Parse an IGES file and extract all Type 100 (Circular Arc) entities.
    
    IGES Type 100 format in Parameter Data section:
    100, ZT, X1, Y1, X2, Y2, X3, Y3;
    Where:
      ZT = Z-displacement of the arc from the XY plane
      X1, Y1 = Center point
      X2, Y2 = Start point
      X3, Y3 = End point
    """
    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Separate sections by column 73 character
    directory_lines = []
    parameter_lines = []
    
    for line in lines:
        if len(line) >= 73:
            section = line[72]
            if section == 'D':
                directory_lines.append(line)
            elif section == 'P':
                parameter_lines.append(line)

    # Join all parameter data (column 1-64) into one string
    param_data = ''
    for line in parameter_lines:
        param_data += line[:64].strip() + ' '

    # Split by semicolons to get individual parameter entries
    param_entries = param_data.split(';')

    arcs = []
    entity_id = 0

    for entry in param_entries:
        entry = entry.strip()
        if not entry:
            continue
        
        # Split by commas
        values = [v.strip() for v in entry.split(',')]
        
        if len(values) < 2:
            continue
            
        try:
            entity_type = int(float(values[0]))
        except (ValueError, IndexError):
            continue

        if entity_type == 100 and len(values) >= 8:
            try:
                entity_id += 1
                zt = float(values[1])   # Z-displacement
                x1 = float(values[2])   # Center X
                y1 = float(values[3])   # Center Y
                x2 = float(values[4])   # Start X
                y2 = float(values[5])   # Start Y
                x3 = float(values[6])   # End X
                y3 = float(values[7].rstrip(';'))  # End Y

                # Calculate radius from center to start point
                import math
                radius = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
                
                # Calculate angles
                start_angle = math.atan2(y2 - y1, x2 - x1)
                end_angle = math.atan2(y3 - y1, x3 - x1)
                
                # Check if full circle (start point ≈ end point)
                dist = math.sqrt((x3 - x2)**2 + (y3 - y2)**2)
                is_full = dist < 0.001 * radius if radius > 0 else False

                arcs.append(CircularArc(
                    entity_id=entity_id,
                    center_x=x1,
                    center_y=y1,
                    center_z=zt,
                    radius=radius,
                    start_angle=math.degrees(start_angle),
                    end_angle=math.degrees(end_angle),
                    is_full_circle=is_full
                ))
            except (ValueError, IndexError) as e:
                continue

    return arcs


def classify_holes(arcs: list[CircularArc]) -> list[HoleFeature]:
    """
    Classify circular arcs into hole groups based on radius ranges.
    
    From drawing 6443124:
    - M6 threaded holes (Balloons 70-73): diameter ~5.0mm (tap drill) → radius ~2.5mm
    - Through holes (Balloons 62-67): diameter ~11.1mm → radius ~5.55mm
    - Flange holes (Balloons 10-13): various sizes
    
    In IGS exports, holes are often represented as multiple arcs that 
    together form a full circle. We group arcs by center proximity and radius.
    """
    import math
    from collections import defaultdict
    
    # Group arcs by similar center+radius (within tolerance)
    CENTER_TOL = 0.5  # mm tolerance for grouping centers
    RADIUS_TOL = 0.1  # mm tolerance for grouping radii
    
    # First pass: find unique hole locations by grouping arcs with same center/radius
    hole_candidates = []
    used = set()
    
    for i, arc in enumerate(arcs):
        if i in used:
            continue
        
        # Find all arcs at this center with this radius
        group = [arc]
        used.add(i)
        total_span = abs(arc.end_angle - arc.start_angle)
        
        for j, other in enumerate(arcs):
            if j in used:
                continue
            if (abs(other.center_x - arc.center_x) < CENTER_TOL and 
                abs(other.center_y - arc.center_y) < CENTER_TOL and
                abs(other.radius - arc.radius) < RADIUS_TOL):
                group.append(other)
                used.add(j)
                total_span += abs(other.end_angle - other.start_angle)
        
        # Consider it a hole if arcs span > 180 degrees or there are multiple arcs
        if total_span > 180 or len(group) >= 2 or arc.is_full_circle:
            avg_x = sum(a.center_x for a in group) / len(group)
            avg_y = sum(a.center_y for a in group) / len(group)
            avg_z = sum(a.center_z for a in group) / len(group)
            avg_r = sum(a.radius for a in group) / len(group)
            hole_candidates.append({
                "x": avg_x, "y": avg_y, "z": avg_z, 
                "radius": avg_r, "arc_count": len(group),
                "span": total_span
            })
    
    # Deduplicate by proximity (holes may appear at multiple Z-levels)
    unique_holes = []
    used_candidates = set()
    XY_DEDUP_TOL = 1.0
    
    for i, h in enumerate(hole_candidates):
        if i in used_candidates:
            continue
        merged = [h]
        used_candidates.add(i)
        for j, other in enumerate(hole_candidates):
            if j in used_candidates:
                continue
            if (abs(other["x"] - h["x"]) < XY_DEDUP_TOL and 
                abs(other["y"] - h["y"]) < XY_DEDUP_TOL and
                abs(other["radius"] - h["radius"]) < RADIUS_TOL):
                merged.append(other)
                used_candidates.add(j)
        
        avg = {
            "x": sum(m["x"] for m in merged) / len(merged),
            "y": sum(m["y"] for m in merged) / len(merged),
            "z": sum(m["z"] for m in merged) / len(merged),
            "radius": sum(m["radius"] for m in merged) / len(merged),
        }
        unique_holes.append(avg)
    
    # Now classify by radius
    holes = []
    hole_id = 0
    
    # M6 threaded holes: tap drill ~5.0mm diameter (radius ~2.5mm)
    M6_RADIUS_MIN = 2.0
    M6_RADIUS_MAX = 3.5
    
    # 11.1mm through holes (radius ~5.55mm)
    THROUGH_RADIUS_MIN = 5.0
    THROUGH_RADIUS_MAX = 6.0
    
    for h in unique_holes:
        group = None
        if M6_RADIUS_MIN <= h["radius"] <= M6_RADIUS_MAX:
            group = 'threaded_m6'
        elif THROUGH_RADIUS_MIN <= h["radius"] <= THROUGH_RADIUS_MAX:
            group = 'through_hole'
        
        if group:
            hole_id += 1
            holes.append(HoleFeature(
                hole_id=hole_id,
                center_x=h["x"],
                center_y=h["y"],
                center_z=h["z"],
                radius=h["radius"],
                diameter=h["radius"] * 2,
                group=group
            ))
    
    return holes


def get_reference_geometry(igs_path: str) -> dict:
    """
    Main entry point: parse IGS and return reference geometry 
    for the inspection system.
    """
    arcs = parse_igs_file(igs_path)
    holes = classify_holes(arcs)
    
    # Summarize
    m6_holes = [h for h in holes if h.group == 'threaded_m6']
    through_holes = [h for h in holes if h.group == 'through_hole']
    
    return {
        "total_arcs": len(arcs),
        "full_circles": len([a for a in arcs if a.is_full_circle]),
        "classified_holes": len(holes),
        "m6_threaded_holes": [
            {"id": h.hole_id, "x": h.center_x, "y": h.center_y, "z": h.center_z, 
             "diameter": h.diameter, "radius": h.radius}
            for h in m6_holes
        ],
        "through_holes": [
            {"id": h.hole_id, "x": h.center_x, "y": h.center_y, "z": h.center_z, 
             "diameter": h.diameter, "radius": h.radius}
            for h in through_holes
        ],
        "all_arcs_summary": {
            "min_radius": min(a.radius for a in arcs) if arcs else 0,
            "max_radius": max(a.radius for a in arcs) if arcs else 0,
        }
    }


if __name__ == "__main__":
    import json
    import sys
    
    igs_path = r"d:\mes\saber turbine housing 3d model.igs"
    result = get_reference_geometry(igs_path)
    print(json.dumps(result, indent=2))
