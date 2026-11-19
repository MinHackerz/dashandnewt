#!/bin/bash
# full s03 rebuild in order (set → chip → person → extra → dive); stops at the first failure
cd "$(dirname "$0")/../.."
run() { o=$(blender -b $1 --python tools/blender/$2 2>&1); echo "$o" | grep -q "$3" || { echo "$o" | grep -E "Error|line [0-9]+" | grep -v -E "arebus|_test_import" | tail -8; echo "FAILED: $2"; exit 1; }; echo "ok $2"; }
run "" s03_set.py "S03 SET BUILT"
run blender/s03_set.blend s03_chip.py "S03 CHIP BUILT"
run blender/s03_set.blend s03_person.py "S03 POSE SET"
run blender/s03_set.blend s03_extra.py "S03 EXTRA BUILT"
run blender/s03_set.blend s03_dive.py "S03 DIVE BUILT"
