Write comprehensive tests for: $ARGUMENTS
Initial Checks:
1. Check if a test file already exists __tests__ directory in the folder of the source file being tested.
If it exits, ask if the user wants to create a new test file or edit the existing test file.

2. If the file does not exist, continue below:

Testing conventions:
* Use Vitests with React Testing Library
* Place test files in a __tests__ directory in the same folder as the source file
* Name test files as [filename].test.ts(x)
* Use @/ prefix for imports

Coverage:
* Test happy paths
* Test edge cases
* Test error states

Documenting Tests:
* After the test is complete, write the output to an md file in the same __tests__ directory in the same folder as the source file.
* Example file name:
test_<name of file tested>_<date and time of test dd-mm-yyyy-hr-min-sec>.md