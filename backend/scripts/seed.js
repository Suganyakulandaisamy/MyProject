import bcrypt from "bcrypt";
import { connectDb, query } from "../db.js";

async function seed() {
  await connectDb();

  const users = [
    { username: "admin1", password: "Admin@123", role: "Admin" },
    { username: "faculty1", password: "Faculty@123", role: "Faculty" },
    { username: "student1", password: "Student@123", role: "Student" }
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await query(
      `
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
          password = excluded.password,
          role = excluded.role
      `,
      [user.username, hash, user.role]
    );
  }

  const defaultSubjects = [
    "Advanced Data Structures",
    "Advanced Microprocessors",
    "Aerospace Engineering Basics",
    "Analog Circuits",
    "Analog Communication",
    "Antenna and Wave Propagation",
    "Applied Linear Algebra",
    "Artificial Intelligence",
    "Automata Theory",
    "Big Data Analytics",
    "Biomedical Instrumentation",
    "CAD for VLSI",
    "C Programming",
    "Circuit Analysis",
    "Cloud Computing",
    "Compiler Design",
    "Computer Architecture",
    "Computer Graphics",
    "Computer Networks",
    "Control Systems",
    "Cryptography",
    "Cyber Security",
    "Data Analytics",
    "Data Communication",
    "Data Mining",
    "Data Structures",
    "Database Management Systems",
    "Design and Analysis of Algorithms",
    "Digital Communication",
    "Digital Electronics",
    "Digital Signal Processing",
    "Discrete Mathematics",
    "Distributed Systems",
    "Electrical Machines",
    "Embedded Systems",
    "Engineering Chemistry",
    "Engineering Drawing",
    "Engineering Economics",
    "Engineering Mathematics",
    "Engineering Physics",
    "Engineering Thermodynamics",
    "Environmental Science",
    "Finite Element Methods",
    "Fluid Mechanics",
    "Formal Languages and Automata",
    "Foundations of Data Science",
    "Human Computer Interaction",
    "Industrial Engineering",
    "Instrumentation Engineering",
    "Internet of Things",
    "Introduction to Machine Learning",
    "Java Programming",
    "Linear Integrated Circuits",
    "Logic Design",
    "Machine Learning",
    "Manufacturing Processes",
    "Material Science",
    "Microcontrollers",
    "Microprocessors",
    "Mobile Computing",
    "Network Security",
    "Numerical Methods",
    "Object Oriented Programming",
    "Operating System",
    "Optical Communication",
    "Pattern Recognition",
    "Power Electronics",
    "Power Systems",
    "Programming in Python",
    "Project Management",
    "Robotics",
    "Signals and Systems",
    "Software Engineering",
    "Software Testing",
    "Structural Analysis",
    "System Programming",
    "Theory of Computation",
    "Thermal Engineering",
    "VLSI Design",
    "Wireless Communication"
  ];

  for (const name of defaultSubjects) {
    await query(
      `
        INSERT INTO subjects (name, faculty_id)
        VALUES (?, NULL)
        ON CONFLICT(name) DO UPDATE SET
          name = excluded.name
      `,
      [name]
    );
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
