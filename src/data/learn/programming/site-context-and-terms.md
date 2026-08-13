---
slug: site-context-and-terms
title: "catstarry.xyz 项目上下文与术语"
track: programming
section: 项目基础
tags: ["Astro", "React", "shadcn/ui", "Cloudflare", "Learn", "Projects"]
state: withdrawn
publishedAt: 2026-07-03
revisedAt: 2026-07-24
excerpt: "从项目简介、技术架构与板块职责进入 catstarry.xyz 的上下文。"
---

## 项目简介

catstarry.xyz 是木下的个人网站，用 AI 驱动搭建。

## 技术架构

### 前端与部署

前端采用 Astro hybrid + React (shadcn/ui)，部署到 Cloudflare Pages；后端使用 Cloudflare Workers，结构化数据使用 D1，缓存与配置使用 KV，媒体使用 R2。

### 内容板块

Learn 是编程学习笔记板块，基于 teach skill 的 lesson 产出，按 track 组织；Projects 是成品项目展示，显示最近 2 个项目。

## 关联阅读

内容画布与可访问性约束集中在 [[content-canvas-and-accessibility]]，学习任务见 [[vibe-coding-mission]]。
