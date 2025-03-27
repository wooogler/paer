"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentSchema = exports.ContentTypeSchemaEnum = exports.ContentTypeSchema = void 0;
const zod_1 = require("zod");
// Define content type
exports.ContentTypeSchema = zod_1.z.enum([
    "paper",
    "section",
    "subsection",
    "paragraph",
    "sentence",
]);
var ContentTypeSchemaEnum;
(function (ContentTypeSchemaEnum) {
    ContentTypeSchemaEnum["Paper"] = "paper";
    ContentTypeSchemaEnum["Section"] = "section";
    ContentTypeSchemaEnum["Subsection"] = "subsection";
    ContentTypeSchemaEnum["Paragraph"] = "paragraph";
    ContentTypeSchemaEnum["Sentence"] = "sentence";
})(ContentTypeSchemaEnum || (exports.ContentTypeSchemaEnum = ContentTypeSchemaEnum = {}));
// Define recursive content schema
exports.ContentSchema = zod_1.z.lazy(() => zod_1.z.object({
    title: zod_1.z.string().optional(),
    summary: zod_1.z.string(),
    intent: zod_1.z.string(),
    type: exports.ContentTypeSchema,
    content: zod_1.z
        .union([zod_1.z.string(), zod_1.z.array(zod_1.z.lazy(() => exports.ContentSchema))])
        .optional(),
    "block-id": zod_1.z.string().optional(),
}));
