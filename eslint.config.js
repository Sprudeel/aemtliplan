// eslint.config.mjs
import globals from "globals";
import vue from "eslint-plugin-vue";
import vueParser from 'vue-eslint-parser'
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import vitest from "eslint-plugin-vitest";

/**
 * Flat config:
 * - Ignore generated and build output
 * - Vue SFC + TypeScript parsing
 * - Node + Browser globals (so console, process, Buffer, URL are defined)
 * - Vitest globals in tests
 */
export default [
    // 0) Ignore noisy stuff
    {
        ignores: [
            ".nuxt/**",
            ".output/**",
            "node_modules/**",
            "dist/**",
            ".vercel/**",
            ".idea/**",
            ".vscode/**",
            "coverage/**",
        ],
    },

    // 1) Vue SFCs
    {
        files: ["**/*.vue"],
        languageOptions: {
            parser: vueParser, // vue-eslint-parser
            parserOptions: {
                parser: tsParser, // for <script lang="ts">
                ecmaVersion: "latest",
                sourceType: "module",
                extraFileExtensions: [".vue"],
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            vue,
            "@typescript-eslint": ts,
        },
        rules: {
            // Start from Vue's recommended rules
            ...vue.configs["flat/recommended"].rules,
            // Light sensible tweaks
            "vue/multi-word-component-names": "off",
            "vue/no-multiple-template-root": "off",
            "vue/no-v-html": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        },
    },

    // 2) TS/JS files
    {
        files: ["**/*.{ts,js,mjs,cjs}"],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            "@typescript-eslint": ts,
        },
        rules: {
            "no-unused-vars": "off", // use TS version
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "no-console": "off",
        },
    },

    // 3) Vitest files: test env + globals (describe, it, expect, vi, etc.)
    {
        files: ["tests/**/*.ts", "tests/**/*.js"],
        plugins: { vitest },
        languageOptions: {
            globals: {
                ...globals.node,
                ...(vitest.environments?.env?.globals ?? {}),
            },
        },
        rules: {
            // You can add vitest-specific rules here if you want
        },
    },

    // 4) Nuxt config & plugins are Node context
    {
        files: ["nuxt.config.*", "vite.config.*", "vitest.config.*", "tailwind.config.*", "postcss.config.*", "prisma/**/*.ts"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            "no-undef": "off",
        },
    },
];