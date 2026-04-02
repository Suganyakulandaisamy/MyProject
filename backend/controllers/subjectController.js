import mongoose from "mongoose";
import Subject from "../models/Subject.js";
import Faculty from "../models/Faculty.js";

export async function listSubjects(req, res) {
  try {
    const subjects = await Subject.find({}).populate("facultyId", "name department").sort({ name: 1 });
    const result = subjects.map((subject) => ({
      id: subject._id.toString(),
      name: subject.name,
      faculty: subject.facultyId
        ? {
            id: subject.facultyId._id.toString(),
            name: subject.facultyId.name,
            department: subject.facultyId.department
          }
        : null
    }));
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch subjects.", error: err.message });
  }
}

export async function addSubject(req, res) {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Subject name is required." });
  }

  const normalized = String(name).trim();

  try {
    const exists = await Subject.findOne({ name: normalized });
    if (exists) {
      return res.status(409).json({ message: "Subject already exists." });
    }

    const subject = await Subject.create({ name: normalized, facultyId: null });
    return res.status(201).json(subject.toJSON());
  } catch (err) {
    return res.status(500).json({ message: "Failed to add subject.", error: err.message });
  }
}

export async function updateSubject(req, res) {
  const { id } = req.params || {};
  const { name } = req.body || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid subject id." });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Subject name is required." });
  }

  const normalized = String(name).trim();

  try {
    const conflict = await Subject.findOne({ name: normalized, _id: { $ne: id } });
    if (conflict) {
      return res.status(409).json({ message: "Subject already exists." });
    }

    const subject = await Subject.findByIdAndUpdate(
      id,
      { name: normalized },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({ message: "Subject not found." });
    }

    await Faculty.updateMany({ subjectId: subject._id }, { $set: { subject: normalized } });

    return res.json(subject.toJSON());
  } catch (err) {
    return res.status(500).json({ message: "Failed to update subject.", error: err.message });
  }
}

export async function deleteSubject(req, res) {
  const { id } = req.params || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid subject id." });
  }

  try {
    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found." });
    }

    await Faculty.updateMany({ subjectId: subject._id }, { $set: { subjectId: null } });

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete subject.", error: err.message });
  }
}
