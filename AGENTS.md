# Buff Me Up — Mac/Xcode Environment Recovery

## Objective

Diagnose and fix the current local macOS/Xcode/Capacitor environment errors preventing Buff Me Up from syncing and building for iOS.

Current errors include:

```text
ENOSPC: no space left on device
```

and:

```text
Couldn't create workspace arena folder ...
Unable to write to info.plist
```

The project path is:

`~/vscode/Buff-me-up`

The agent may use terminal commands to inspect and repair the local development environment.

Do not modify application product functionality as part of this task.

---

## 1. Diagnose Disk Space

Check available filesystem space using commands such as:

```bash
df -h /
df -h ~
```

Report:

* total space
* used space
* available space
* filesystem utilization percentage

Determine whether insufficient disk space is causing the Xcode and Capacitor failures.

---

## 2. Inspect Xcode Storage

Measure major Xcode-related storage locations without deleting anything initially.

Inspect:

```bash
~/Library/Developer/Xcode/DerivedData
~/Library/Developer/Xcode/Archives
~/Library/Developer/CoreSimulator
```

Also inspect other obviously large Xcode development directories if relevant.

Report their approximate sizes.

---

## 3. Safe Cleanup

If disk space is critically low, perform only low-risk development cleanup first.

Safe cleanup may include:

### Xcode DerivedData

Delete generated DerivedData contents:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

DerivedData is generated build/index data and may be rebuilt by Xcode.

### Buff Me Up generated Capacitor web/native copy state

If appropriate, remove incomplete generated sync directories such as:

```bash
~/vscode/Buff-me-up/ios/App/App/public
~/vscode/Buff-me-up/ios/capacitor-cordova-ios-plugins
```

Only remove these if they are generated artifacts and the current partial sync left them incomplete.

Do not delete the entire iOS project.

---

## 4. Do Not Delete Without Explicit Approval

Do NOT automatically delete:

* personal files
* Documents
* Downloads
* Photos
* Desktop files
* Xcode Archives
* iOS Simulator devices
* application source code
* Git repositories
* system files
* user caches outside development tooling
* anything whose purpose is uncertain

If additional disk space beyond DerivedData cleanup is needed, stop and report the largest candidate directories instead of deleting them.

---

## 5. Check DerivedData Permissions

Inspect:

```bash
ls -ld ~/Library/Developer/Xcode/DerivedData
```

Verify the current macOS user owns the directory and has read/write/execute permission.

Test writing:

```bash
touch ~/Library/Developer/Xcode/DerivedData/buff-me-up-write-test
```

Delete the test file afterward.

If ownership is incorrect, correct only the Xcode DerivedData directory using the minimum necessary ownership/permission change.

Do not run broad recursive `chmod 777`.

Prefer correct user ownership and user read/write/execute permissions.

---

## 6. Recreate DerivedData Directory If Needed

If the directory is corrupted or missing:

```bash
mkdir -p ~/Library/Developer/Xcode/DerivedData
```

Ensure the current user can write to it.

---

## 7. Verify Disk Space Again

After cleanup, run:

```bash
df -h /
df -h ~
```

Report how much disk space was recovered.

Prefer at least approximately 10–15 GB of free space before attempting another full Xcode/iOS build.

If significantly less than that remains, stop and report before continuing.

---

## 8. Validate Capacitor Config

From:

`~/vscode/Buff-me-up`

inspect:

`capacitor.config.ts`

Do not change unrelated configuration.

Confirm the project is currently configured for the expected Buff Me Up iOS prototype.

Do not silently change authentication or application architecture in this environment-recovery task.

---

## 9. Repair Partial Capacitor Sync

If sufficient disk space exists, run:

```bash
cd ~/vscode/Buff-me-up
npx cap sync ios
```

If sync fails because of artifacts from the earlier incomplete operation, remove only the clearly generated incomplete directories and retry.

Do not recreate the full `ios/` platform unless absolutely necessary.

---

## 10. Xcode Build Preparation

After a successful Capacitor sync:

* confirm the iOS project still exists
* confirm the expected bundle identifier remains:
  `com.laurinvasquez.buffmeup`
* do not alter signing certificates
* do not change the selected Apple team

If possible from the available environment, verify the project can be opened/build-prepared.

Do not perform App Store distribution.

---

## 11. Verification

At minimum verify:

```bash
df -h /
ls -ld ~/Library/Developer/Xcode/DerivedData
touch ~/Library/Developer/Xcode/DerivedData/buff-me-up-write-test
rm ~/Library/Developer/Xcode/DerivedData/buff-me-up-write-test
npx cap sync ios
```

If appropriate, also run existing project checks:

```bash
npm run typecheck
npm run lint
```

Do not spend time on unrelated application changes.

---

## Completion Report

Return:

1. Root cause found
2. Disk space before cleanup
3. Xcode storage sizes inspected
4. Files/directories safely removed
5. Disk space after cleanup
6. DerivedData ownership/permissions status
7. Whether write testing succeeded
8. Whether `npx cap sync ios` succeeded
9. Any remaining errors
10. Any cleanup requiring owner approval
11. Exact next manual step in Xcode

Do not start native OAuth work or product development as part of this task.
