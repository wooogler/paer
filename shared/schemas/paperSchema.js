"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaperSchema = void 0;
const zod_1 = require("zod");
const contentSchema_1 = require("./contentSchema");
// Define paper schema
exports.PaperSchema = zod_1.z.object({
    title: zod_1.z.string(),
    summary: zod_1.z.string(),
    intent: zod_1.z.string(),
    type: zod_1.z.literal("paper"),
    content: zod_1.z.array(contentSchema_1.ContentSchema),
    // Paper specific properties
    createdAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
    version: zod_1.z.number().optional(),
    authors: zod_1.z.array(zod_1.z.string()).optional(),
    "block-id": zod_1.z.string().optional(),
});
