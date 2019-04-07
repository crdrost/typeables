# Typeables

Little runtime JSONSchema types.

# What this is

Let’s say you write a nice TypeScript application. But, the type-safety disappears at runtime: TypeScript compiles to JS and then disappears. But now maybe you want to do some sort of `JSON.parse(file)` type of behavior. Or, maybe your app has environment variables that just are assumed to be there. What do you do?

Well, what most people do is to just use that `JSON.parse()` function, it returns an `any`, and they let the program crash when the input is invalid.

Let’s suppose you want a stronger guarantee.

So then in practice you would repeat yourself: you have a JSONSchema description of your type, present at runtime, used to validate data and fail fast on bad inputs, and a TypeScript version of your type, present at compile time, used to make your code more reliable. Then, problems occur when you update one of these and not the other—they are only joined by an `any` type, so anything goes.

A **typeable** is a JavaScript object—it is present at runtime—which describes a type. You construct it with functions exposed by this library. However, at compile-time it corresponds to a specific TypeScript type and can even generate random data of the appropriate type.
