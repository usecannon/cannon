# Contributing to Cannon

 - [Code of Conduct](#coc)
 - [Question or Problem?](#question)
 - [Issues and Bugs](#issue)
 - [Feature Requests](#feature)
 - [Submission Guidelines](#submit)
 - [Coding Rules](#rules)
 - [Commit Message Guidelines](#commit)

## <a name="coc"></a> Code of Conduct
Help us keep Cannon open and inclusive. Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## <a name="question"></a> Got a Question or Problem?

Do not open issues for general support questions as we want to keep GitHub issues for bug reports and feature requests.

If you would like to chat about the question in real-time, you can reach out via [our discord channel][discord].

## <a name="issue"></a> Found a Bug?
If you find a bug in the source code, you can help us by
[submitting an issue](#submit-issue) to our [GitHub Repository](https://github.com/usecannon/cannon/). Even better, you can
[submit a Pull Request](#submit-pr) with a fix.

## <a name="feature"></a> Missing a Feature?
You can *request* a new feature by [submitting an issue](#submit-issue) to our GitHub
Repository. If you would like to *implement* a new feature, please submit an issue with
a proposal for your work first, to be sure that we can use it.
Please consider what kind of change it is:

* For a **Major Feature**, first open an issue and outline your proposal so that it can be
discussed. This will also allow us to better coordinate our efforts, prevent duplication of work,
and help you to craft the change so that it is successfully accepted into the project.
* **Small Features** can be crafted and directly [submitted as a Pull Request](#submit-pr).

## <a name="rules"></a> Coding Rules
To ensure consistency throughout the source code, keep these rules in mind as you are working:

* All features or bug fixes **must be tested** by one or more specs (unit-tests).
* All public Cannonfile Config actions and CLI commands **must be documented**.
* We follow [Google's Typescript Style Guide](https://google.github.io/styleguide/tsguide.html).

We would love for you to contribute to cannon and help make it even better than it is
today! As a contributor, here are the guidelines we would like you to follow:

 - [Code of Conduct](#coc)
 - [Commit Message Guidelines](#commit)

## <a name="version"></a> Versioning
We follow the [SemVer](https://semver.org/) or Semantic Versioning strategy, please review their guidelines to ensure you understand the requirements for 
bumping versions.
 
## <a name="commit"></a> Commit Message Guidelines

To ensure a standardized format and help with autogenerating release notes, this repo uses commitlint, specifically the conventional config [commitlint/config-conventional](https://github.com/conventional-changelog/commitlint), please follow the conventional format for writing commit messages.

We have very precise rules over how our git commit messages can be formatted.  This leads to **more
readable messages** that are easy to follow when looking through the **project commit history**.  But also,
we use the git commit messages to **generate the Cannon change log**.

### Commit Message Format

We use the [ConventionalCommits](https://www.conventionalcommits.org/en/v1.0.0/#summary) format. Make sure to check their docs out for an in-depth look 
at the different rules and how they affect our commit format.

Each commit message consists of a **header**, an optional **body** and an optional **footer**.  The header has a special
format that includes a **type**, an optional **scope** and a **subject**:

```
<type>(scope [optional]): <subject>
<BLANK LINE>
<body (optional)>
<BLANK LINE>
<footer (optional)>
```

The **header** is mandatory and the **scope** of the header is optional.

Any line of the commit message cannot be longer 100 characters! This allows the message to be easier
to read on GitHub as well as in various git tools.

The footer should contain a [closing reference to an issue](https://help.github.com/articles/closing-issues-via-commit-messages/) if any.

Samples: 

```
docs(changelog): update changelog
```
```
fix(release): need to depend on latest hardhat

The version in our package.json gets copied to the one we publish, and users need the latest of these dependencies.
```

### Type
The most important prefixes you should have in mind are:

**fix**: which represents bug fixes, and correlates to a SemVer patch.
**feat**: which represents a new feature, and correlates to a SemVer minor.
**feat!**:, or **fix!**:, **refactor!**:, etc., which represent a breaking change (indicated by the !) and will result in a SemVer major.

Must match one of the [conventional commit types](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional#type-enum).

### Scope
The scope should be the name of the package affected by the commit. 
`The list of supported scopes matches the list of packages under the packages/ directory

For extra reference, the following is a list of supported scopes:

* **builder**
* **cli**
* **hardhat-cannon**

### Subject
The subject contains a succinct description of the change:

* use the imperative, present tense: "change" not "changed" nor "changes"
* don't capitalize the first letter
* no dot (.) at the end

### Body (Optional)
Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
The body should include the motivation for the change and contrast this with previous behavior.

### Footer (Optional)
The footer should contain any information about **Breaking Changes** and is also the place to
reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

A detailed explanation can be found in this [document](#commit).

### Revert
If the commit reverts a previous commit, it should begin with `revert: `, followed by the header of the reverted commit. In the body it should say: `This reverts commit <hash>.`, where the hash is the SHA of the commit being reverted.


## <a name="submit"></a> Submission Guidelines

### <a name="submit-issue"></a> Submitting an Issue

Before you submit an issue, please search the issue tracker, maybe an issue for your problem already exists and the discussion might inform you of workarounds readily available.

We want to fix all the issues as soon as possible, but before fixing a bug we need to reproduce and confirm it. In order to reproduce bugs, we will systematically ask you to provide a minimal reproduction scenario using [Plnkr](http://plnkr.co) or [Github Codespaces](https://github.com/features/codespaces). Having a live, reproducible scenario gives us a wealth of important information without going back & forth to you with additional questions like:

- version of Cannon used
- 3rd-party libraries and their versions
- and most importantly - the use-case that fails

A minimal reproduce scenario using [Plnkr](http://plnkr.co) or [Github Codespaces](https://github.com/features/codespaces) allows us to quickly confirm a bug (or point out coding problem) as well as confirm that we are fixing the right problem. If plunker is not a suitable way to demonstrate the problem (for example for issues related to our npm packaging), please create a standalone git repository demonstrating the problem.

Depending on the issue, we will be insisting on a minimal reproduce scenario in order to save maintainers time and ultimately be able to fix more bugs. Interestingly, from our experience users often find coding problems themselves while preparing a minimal plunk. We understand that sometimes it might be hard to extract essentials bits of code from a larger code-base but we really need to isolate the problem before we can fix it.

Unfortunately, in many cases we are not able to investigate / fix bugs without a minimal reproduction, so if we don't hear back from you we are going to close an issue that doesn't have enough info to be reproduced.


### <a name="submit-pr"></a> Submitting a Pull Request (PR)
Before you submit your Pull Request (PR) consider the following guidelines:

1. Search [GitHub](https://github.com/usecannon/cannon/pulls) for an open or closed PR
  that relates to your submission. You don't want to duplicate effort.
1. Fork the usecannon/cannon repo.
1. Make your changes in a new git branch:

     ```shell
     git checkout -b my-fix-branch main
     ```

1. Create your patch, **including appropriate test cases**.
1. Follow our [Coding Rules](#rules).
1. Run the full cannon test suite: 
  - From the root of the repo run `npm run test-all`, and ensure that all tests pass.
1. Commit your changes using a descriptive commit message that follows our
  [commit message conventions](#commit). Adherence to these conventions
  is necessary because release notes are automatically generated from these messages.

     ```shell
     git commit -a
     ```
    Note: the optional commit `-a` command line option will automatically "add" and "rm" edited files.

1. Push your branch to GitHub:

    ```shell
    git push origin my-fix-branch
    ```

1. In GitHub, send a pull request to `cannon:main`.
* If we suggest changes then:
  * Make the required updates.
  * Re-run the Cannon test suites to ensure tests are still passing.
  * Rebase your branch and force push to your GitHub repository (this will update your Pull Request):

    ```shell
    git rebase main -i
    git push -f
    ```

That's it! Thank you for your contribution!

#### After your pull request is merged

After your pull request is merged, you can safely delete your branch and pull the changes
from the main (upstream) repository:

* Check out the main branch:

    ```shell
    git checkout main -f
    ```

* Delete the local branch:

    ```shell
    git branch -D my-fix-branch
    ```

* Update your main with the latest upstream version:

    ```shell
    git pull --ff upstream main
    ```
