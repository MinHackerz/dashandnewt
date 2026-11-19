// Prints this Mac's thermal state as macOS reports it (the same signal the OS uses to throttle):
// 0 nominal, 1 fair, 2 serious, 3 critical. Compiled once by thermal_guard.py.
import Foundation
print(ProcessInfo.processInfo.thermalState.rawValue)
