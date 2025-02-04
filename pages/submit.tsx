import Head from "next/head";
import { useRouter } from "next/router";
import { useContext, useState } from "react";
import { checkAndRefreshToken, fetchDiscordUrl } from "../api";

import { CSSSubmissionInfo, GitSubmissionInfo, MetaInfo, ZipSubmissionInfo } from "../types";
import {
  CSSSubmitPanel,
  GitSubmitPanel,
  LoadingPage,
  LogInPage,
  MetaSubmitPanel,
  MiniDivider,
  partHeaderClasses,
  TosCheckboxes,
  ZipSubmitPanel,
} from "../components";
import { useHasCookie } from "../hooks";
import { authContext } from "./_app";
import { toast } from "react-toastify";

const BigDivider = () => {
  return <div className="h-2 w-full bg-borderLight dark:bg-borderDark my-2" />;
};

export default function Submit() {
  const router = useRouter();

  const hasCookie = useHasCookie();
  const { accountInfo } = useContext(authContext);

  // Having these all is mostly for type-safety, but it has the added bonus of allowing you to switch back and forth from types without losing data
  const [gitUploadInfo, setGitUploadInfo] = useState<GitSubmissionInfo>({
    url: "",
    commit: "",
    subfolder: "",
  });
  const [cssUploadInfo, setCSSUploadInfo] = useState<CSSSubmissionInfo>({
    css: "",
    name: "",
  });
  const [zipUploadInfo, setZipUploadInfo] = useState<ZipSubmissionInfo>({
    blob: "",
  });

  const [uploadType, setUploadType] = useState<"css" | "audio">("css");

  const [metaInfo, setMetaInfo] = useState<MetaInfo>({
    imageBlobs: [],
    description: "",
    target: "None",
  });

  const [hasAcceptedTos, setHasAcceptedTos] = useState<boolean>(false);

  function checkIfReady() {
    let ready = false;
    switch (uploadMethod) {
      case "git":
        if (gitUploadInfo.url) ready = true;
        break;
      case "css":
        if (cssUploadInfo.css && cssUploadInfo.name) ready = true;
        break;
      case "zip":
        if (zipUploadInfo.blob) ready = true;
    }
    return ready && hasAcceptedTos;
  }

  async function submitTheme() {
    const data = () => {
      switch (uploadMethod) {
        case "git":
          return gitUploadInfo;
        case "css":
          return cssUploadInfo;
        default:
          return zipUploadInfo;
      }
    };
    const formattedMeta = {
      imageBlobs: metaInfo.imageBlobs,
      description: metaInfo.description || null,
      target: metaInfo.target !== "None" ? metaInfo.target : null,
    };
    const waitForRefresh = await checkAndRefreshToken();
    if (waitForRefresh) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/submissions/${uploadType}_${uploadMethod}`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ ...data(), meta: formattedMeta }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          process.env.NEXT_PUBLIC_DEV_MODE === "true" && console.log(res);
          if (res.status < 200 || res.status >= 300 || !res.ok) {
            console.log("Submission POST Not OK!, Error Code ", res.status);
          }
          return res.json();
        })
        .then((json) => {
          process.env.NEXT_PUBLIC_DEV_MODE === "true" && console.log(json);
          if (json?.task) {
            router.push(`/taskStatus/view?task=${json.task}`);
          } else {
            alert(`Error Submitting Theme: ${json?.message || "Unknown Error"}`);
            throw new Error("No task in response");
          }
        })
        .catch((err) => {
          toast.error(`Error Submitting Theme! ${JSON.stringify(err)}`);
          console.error("Error Submitting Theme!", err);
        });
    }
  }

  const [uploadMethod, setUploadMethod] = useState<string>("git");
  if (accountInfo?.username) {
    return (
      <>
        <Head>
          <title>DeckThemes | Submit</title>
        </Head>
        <style>
          {`
        
        .dark .filepond--panel-root {
          background-color: #2e2e2e;
        }
        .dark .filepond--drop-label {
          color: #fff;
        }
        `}
        </style>
        <div className="flex flex-col items-center w-full grow text-center gap-4 pt-4">
          <h1 className="text-3xl md:text-4xl font-semibold py-4">Submit A Theme</h1>
          <div className="m-4 px-4 py-2 bg-cardLight dark:bg-cardDark hover:bg-borderLight hover:dark:bg-borderDark transition-colors rounded-xl text-xl">
            <a
              href={process.env.NEXT_PUBLIC_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-transparent bg-clip-text bg-gradient-to-tl from-blue-800 to-blue-500 p-1 rounded-3xl"
            >
              <span className="text-textLight dark:text-textDark">Need help? </span>
              <br className="flex md:hidden" />
              View the docs <br className="flex md:hidden" />
              <span className="text-textLight dark:text-textDark">
                for guides, documentation, and tools!
              </span>
            </a>
          </div>
          <main className="w-11/12 bg-cardLight dark:bg-cardDark rounded-3xl flex flex-col items-center">
            <section className="p-4 w-full flex flex-col items-center">
              <div className="flex flex-col items-center gap-4 justify-center mb-4">
                <span className={partHeaderClasses}>Part 1: Upload Your Theme</span>
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="flex flex-col h-20">
                    <span>Upload Method</span>
                    <select
                      className="bg-bgLight dark:bg-bgDark rounded-md h-full p-4 md:py-0 text-xl text-center"
                      value={uploadMethod}
                      onChange={({ target: { value } }) => {
                        setUploadMethod(value);
                        if (value === "css") {
                          setUploadType("css");
                        }
                      }}
                    >
                      <option value="git">Link Git Repo</option>
                      <option value="zip">Upload Zip</option>
                      <option value="css">Paste CSS Snippet</option>
                    </select>
                  </div>
                  <div className="flex flex-col h-20">
                    <span>Target Plugin</span>
                    <select
                      className="bg-bgLight dark:bg-bgDark rounded-md h-full p-4 md:py-0 text-xl text-center"
                      value={uploadType}
                      onChange={({ target: { value } }) => {
                        if (value === "css" || value === "audio") {
                          setUploadType(value);
                        }
                      }}
                    >
                      <option value="css">CSS Loader</option>
                      <option value="audio" disabled={uploadMethod === "css"}>
                        Audio Loader
                      </option>
                    </select>
                  </div>
                </div>
              </div>
              <MiniDivider />
              <div className="pb-4" />
              {uploadMethod === "zip" && (
                <ZipSubmitPanel info={zipUploadInfo} setInfo={setZipUploadInfo} />
              )}
              {uploadMethod === "git" && (
                <GitSubmitPanel info={gitUploadInfo} setInfo={setGitUploadInfo} />
              )}
              {uploadMethod === "css" && (
                <CSSSubmitPanel info={cssUploadInfo} setInfo={setCSSUploadInfo} />
              )}
            </section>
            <BigDivider />
            <section className="p-4 w-full flex flex-col items-center">
              <span className={partHeaderClasses}>Part 2: Add More Info</span>
              <MetaSubmitPanel
                info={metaInfo}
                setInfo={setMetaInfo}
                uploadType={uploadType}
                uploadMethod={uploadMethod}
              />
            </section>
            <BigDivider />
            <section className="p-4 w-full flex flex-col items-center">
              <span className={partHeaderClasses}>Part 3: Accept Terms</span>
              <TosCheckboxes setCheckValue={setHasAcceptedTos} uploadType={uploadType} />
            </section>
            <BigDivider />
            <section className="p-4 w-full flex flex-col items-center">
              {checkIfReady() ? (
                <>
                  <button className="bg-gradient-to-tl from-green-700 to-lime-300 p-4 text-2xl md:text-3xl font-medium rounded-3xl mb-4">
                    <span
                      className="text-textDark dark:text-textLight font-fancy"
                      onClick={() => submitTheme()}
                    >
                      Submit
                    </span>
                  </button>
                </>
              ) : (
                <div className="p-4 text-2xl md:text-3xl font-medium rounded-3xl mb-4">
                  <span>Add Info Before Submitting</span>
                </div>
              )}
            </section>
          </main>
        </div>
      </>
    );
  }
  if (hasCookie) {
    return <LoadingPage />;
  }
  return <LogInPage />;
}
