import { withCSV } from "../index";
import expect from "expect";
import { execute, it } from "./test-suite";

execute([
  it('should load an array of the "First name" column', async () => {
    expect(
      await withCSV("src/test/data/small.csv").query(["First name"]).toArray()
    ).toEqual([
      { "First name": "Aloysius" },
      { "First name": "University" },
      { "First name": "Gramma" },
      { "First name": "Electric" },
      { "First name": "Fred" },
      { "First name": "Betty" },
      { "First name": "Cecil" },
      { "First name": "Bif" },
      { "First name": "Andrew" },
      { "First name": "Jim" },
      { "First name": "Art" },
      { "First name": "Jim" },
      { "First name": "Ima" },
      { "First name": "Benny" },
      { "First name": "Boy" },
      { "First name": "Harvey" },
    ]);
  }),
]);
