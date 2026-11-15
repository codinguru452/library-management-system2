import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Upsert makes this seed safe to run more than once.
  const genreData = [
    {
      name: 'Fiction',
      slug: 'fiction',
      description: 'Novels and imaginative stories',
    },
    {
      name: 'Technology',
      slug: 'technology',
      description: 'Programming, computing and technology',
    },
    {
      name: 'History',
      slug: 'history',
      description: 'Historical events, people and biographies',
    },
    {
      name: 'Business',
      slug: 'business',
      description: 'Business, leadership and entrepreneurship',
    },
  ];

  const genres = await Promise.all(
    genreData.map((genre) =>
      prisma.genre.upsert({
        where: { slug: genre.slug },
        update: {
          name: genre.name,
          description: genre.description,
        },
        create: genre,
      }),
    ),
  );

  const genreBySlug = Object.fromEntries(
    genres.map((genre) => [genre.slug, genre.id]),
  ) as Record<string, number>;

  const books = [
    { title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: 'LIB-ISBN-0001', publishedYear: 1958, genreId: genreBySlug.fiction },
    { title: 'The River Between', author: 'Ngugi wa Thiong’o', isbn: 'LIB-ISBN-0002', publishedYear: 1965, genreId: genreBySlug.fiction },
    { title: 'Purple Hibiscus', author: 'Chimamanda Ngozi Adichie', isbn: 'LIB-ISBN-0003', publishedYear: 2003, genreId: genreBySlug.fiction },
    { title: 'Half of a Yellow Sun', author: 'Chimamanda Ngozi Adichie', isbn: 'LIB-ISBN-0004', publishedYear: 2006, genreId: genreBySlug.fiction },

    { title: 'Clean Code', author: 'Robert C. Martin', isbn: 'LIB-ISBN-0005', publishedYear: 2008, genreId: genreBySlug.technology },
    { title: 'The Pragmatic Programmer', author: 'David Thomas and Andrew Hunt', isbn: 'LIB-ISBN-0006', publishedYear: 1999, genreId: genreBySlug.technology },
    { title: 'Code Complete', author: 'Steve McConnell', isbn: 'LIB-ISBN-0007', publishedYear: 2004, genreId: genreBySlug.technology },
    { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen et al.', isbn: 'LIB-ISBN-0008', publishedYear: 2009, genreId: genreBySlug.technology },

    { title: 'A History of Kenya', author: 'Robert M. Maxon', isbn: 'LIB-ISBN-0009', publishedYear: 1989, genreId: genreBySlug.history },
    { title: 'The Art of War', author: 'Sun Tzu', isbn: 'LIB-ISBN-0010', publishedYear: null, genreId: genreBySlug.history },
    { title: 'Long Walk to Freedom', author: 'Nelson Mandela', isbn: 'LIB-ISBN-0011', publishedYear: 1994, genreId: genreBySlug.history },
    { title: 'The Diary of a Young Girl', author: 'Anne Frank', isbn: 'LIB-ISBN-0012', publishedYear: 1947, genreId: genreBySlug.history },

    { title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', isbn: 'LIB-ISBN-0013', publishedYear: 1997, genreId: genreBySlug.business },
    { title: 'Think and Grow Rich', author: 'Napoleon Hill', isbn: 'LIB-ISBN-0014', publishedYear: 1937, genreId: genreBySlug.business },
    { title: 'The Lean Startup', author: 'Eric Ries', isbn: 'LIB-ISBN-0015', publishedYear: 2011, genreId: genreBySlug.business },
    { title: 'Start with Why', author: 'Simon Sinek', isbn: 'LIB-ISBN-0016', publishedYear: 2009, genreId: genreBySlug.business },
  ];

  // createMany + skipDuplicates prevents duplicate ISBN rows on reruns.
  const result = await prisma.book.createMany({
    data: books,
    skipDuplicates: true,
  });

  // Optionally create a librarian account from local environment variables.
  // Never hard-code a production password in this file.
  const librarianEmail = process.env.LIBRARIAN_EMAIL;
  const librarianPassword = process.env.LIBRARIAN_PASSWORD;
  if (librarianEmail && librarianPassword) {
    const passwordHash = await bcrypt.hash(librarianPassword, 12);
    await prisma.user.upsert({
      where: { email: librarianEmail.toLowerCase() },
      update: { name: 'Library Librarian', passwordHash, role: Role.LIBRARIAN },
      create: {
        name: 'Library Librarian',
        email: librarianEmail.toLowerCase(),
        passwordHash,
        role: Role.LIBRARIAN,
      },
    });
    console.log(`Librarian account ready: ${librarianEmail}`);
  } else {
    console.log('Librarian account skipped (set LIBRARIAN_EMAIL and LIBRARIAN_PASSWORD to create one).');
  }

  console.log(`Seed complete: ${genres.length} genres found/created.`);
  console.log(`${result.count} new books inserted; existing ISBNs were skipped.`);
}

main()
  .catch((error: unknown) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
