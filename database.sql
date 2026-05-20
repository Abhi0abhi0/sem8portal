-- ═══════════════════════════════════════════════════════════
-- RGPV 8th Semester CS Study Portal - Database Schema
-- ═══════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS sem8portal;
USE sem8portal;

-- Users (name + college only, no password)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    college VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user (name, college)
);

-- Subjects (8th sem only)
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(20) NOT NULL,
    subject_name VARCHAR(200) NOT NULL,
    subject_type ENUM('core','dept_elective','open_elective') NOT NULL DEFAULT 'core',
    credits INT DEFAULT 3,
    description TEXT,
    sort_order INT DEFAULT 0
);

-- PDFs (IMPs, Notes, Syllabus etc.)
CREATE TABLE IF NOT EXISTS pdfs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category ENUM('syllabus','imp','notes','previous_year','other') DEFAULT 'imp',
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════
-- SEED: RGPV 8th Sem CS Subjects (from official syllabus)
-- ═══════════════════════════════════════════════════════════

INSERT INTO subjects (subject_code, subject_name, subject_type, credits, description, sort_order) VALUES

-- Core Subject
('CS801', 'Internet of Things', 'core', 4,
 'Understanding technologies and standards relating to IoT. Covers IoT architecture, sensors, actuators, networking protocols (MQTT, CoAP), platforms like Arduino & Raspberry Pi, and real-world case studies.',
 1),

-- Departmental Electives
('CS802-A', 'Block Chain Technologies', 'dept_elective', 3,
 'Covers Bitcoin, smart contracts, distributed consensus, permissioned blockchains, Hyperledger Fabric, Ethereum, and enterprise blockchain applications like KYC and supply chain.',
 2),

('CS802-B', 'Cloud Computing', 'dept_elective', 3,
 'SOA, web services, virtualization, multi-tenancy, cloud storage (GFS, HDFS, BigTable), MapReduce, cloud security, QoS, mobile cloud computing and performance evaluation.',
 3),

('CS802-C', 'High Performance Computing', 'dept_elective', 3,
 'Modern processor architectures, memory hierarchies, OpenMP shared memory programming, MPI distributed memory programming, parallel computing fundamentals and performance optimization.',
 4),

('CS802-D', 'Object Oriented Software Engineering', 'dept_elective', 3,
 'OOP paradigm, RUP lifecycle, UML diagrams (use case, class, sequence, state), OO analysis & design, design patterns, OO testing strategies and project management.',
 5),

-- Open Electives
('CS803-A', 'Image Processing and Computer Vision', 'open_elective', 3,
 'Image filtering, morphological processing, segmentation, edge detection, Hough transform, region analysis, object recognition, neural networks and ML for image recognition.',
 6),

('CS803-B', 'Game Theory with Engineering Applications', 'open_elective', 3,
 'Game design fundamentals, meaningful play, semiotics, system theory, interactivity, rules (operational/constitutive/implicit), design process and case studies.',
 7),

('CS803-C', 'Internet of Things (Open)', 'open_elective', 3,
 'Same content as CS801 — IoT definition, sensors, networking, protocols, platforms and case studies. Available as open elective for non-CS students.',
 8),

('CS803-D', 'Managing Innovation and Entrepreneurship', 'open_elective', 3,
 'Innovation classification, entrepreneurship, creative methods, Stage Gate model, open innovation, co-creation strategies, financial and non-financial metrics for innovation.',
 9);
