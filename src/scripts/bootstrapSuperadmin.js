import bcrypt from "bcrypt";
import { User } from "../models/User.js";
import { sequelize } from "../config/db.js";

const {
  SUPERADMIN_FIRST_NAME,
  SUPERADMIN_LAST_NAME,
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
} = process.env;

const requiredVariables = [
  "SUPERADMIN_FIRST_NAME",
  "SUPERADMIN_LAST_NAME",
  "SUPERADMIN_EMAIL",
  "SUPERADMIN_PASSWORD",
];

const missingVariables = requiredVariables.filter(
  (variable) => !process.env[variable]
);

if (missingVariables.length > 0) {
  throw new Error(
    `Faltan variables requeridas: ${missingVariables.join(", ")}`
  );
}

const email = SUPERADMIN_EMAIL.trim().toLowerCase();

try {
  await sequelize.authenticate();

  const existingUser = await User.findOne({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.role !== "superadmin") {
      await existingUser.update({ role: "superadmin" });
      console.log("Usuario existente actualizado a superadmin.");
    } else {
      console.log("El superadmin ya existe.");
    }
  } else {
    const password = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

    await User.create({
      firstName: SUPERADMIN_FIRST_NAME,
      lastName: SUPERADMIN_LAST_NAME,
      email,
      password,
      role: "superadmin",
    });

    console.log("Superadmin creado correctamente.");
  }
} finally {
  await sequelize.close();
}