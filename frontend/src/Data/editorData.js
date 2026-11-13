export const LANGS = {
  Python: {
    monaco: "python",
    ext: "py",
    main: "main.py",
    code: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

print("Found at index", binary_search([5, 10, 20, 30, 40], 30))
`,
  },

  C: {
    monaco: "c",
    ext: "c",
    main: "main.c",
    code: `#include <stdio.h>

int main(void) {
    printf("Hello, CloudCode\\n");
    return 0;
}
`,
  },

  "C++": {
    monaco: "cpp",
    ext: "cpp",
    main: "main.cpp",
    code: `#include <iostream>

int main() {
    std::cout << "Hello, CloudCode" << std::endl;
    return 0;
}
`,
  },

  Java: {
    monaco: "java",
    ext: "java",
    main: "Main.java",
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CloudCode");
    }
}
`,
  },

  JavaScript: {
    monaco: "javascript",
    ext: "js",
    main: "index.js",
    code: `const arr = [5, 10, 20, 30, 40];
console.log("Found at index", arr.indexOf(30));
`,
  },
};

export const TABS = [
  "Input",
  "Terminal",
  "Problems",
  "Execution Details",
];

export const ICONS = {
  save: "M5 3h11l3 3v15H5V3Zm3 0v5h7V3M8 21v-7h8v7",
  run: "M7 4v16l13-8L7 4Z",
  share: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  file: "M6 3h8l5 5v13H6V3Zm8 0v5h5",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16v4Z",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  back: "M15 6l-6 6 6 6",
};