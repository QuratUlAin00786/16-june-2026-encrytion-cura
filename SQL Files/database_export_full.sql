-- =============================================
-- Healthcare EMR Database Export
-- Generated: 2025-11-02T12:15:21.359Z
-- Environment: Development
-- SECURITY NOTE: Credentials excluded for safety
-- =============================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- Schema export failed or timed out


-- =============================================
-- DATA EXPORT (76 tables)
-- =============================================

-- Data export failed/timed out for table: ai_insights

-- Data export failed/timed out for table: appointments


-- Table: chatbot_analytics
--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (165f042)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: chatbot_analytics; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: chatbot_analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.chatbot_analytics_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--



-- Table: chatbot_configs
--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (165f042)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: chatbot_configs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: chatbot_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.chatbot_configs_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--


