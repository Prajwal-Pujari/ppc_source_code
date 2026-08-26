import sys
sys.path.insert(0, r"d:\mes\cv-inspection")

from app.igs_parser import get_reference_geometry
import json

r = get_reference_geometry(r"d:\mes\saber turbine housing 3d model.igs")
print(f"Total arcs: {r['total_arcs']}")
print(f"Full circles: {r['full_circles']}")
print(f"Classified holes: {r['classified_holes']}")
print(f"M6 threaded holes found: {len(r['m6_threaded_holes'])}")
print(f"Through holes found: {len(r['through_holes'])}")
print(f"Radius range: {r['all_arcs_summary']['min_radius']:.2f} to {r['all_arcs_summary']['max_radius']:.2f} mm")
