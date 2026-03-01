/* eslint-disable react/destructuring-assignment */
import Chip from "@mui/material/Chip";
import { styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import { useEffect, useRef, useState } from "react";
import { Empty } from "antd";
import { ExpandOutlined } from "@ant-design/icons";
import ActionButton from "./ActionButton";
import ERPUtils from "./ERPUtils";
import UppyUploader from "./UppyUploader";
import "./UploadComponent.css";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import PDFViewer from "../../PDFViewer";

// pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

const ListItem = styled("li")(({ theme }) => ({
    margin: theme.spacing(0.5),
}));

export default function UploadViewPopup(props) {
    const {
        data,
        submitData,
        onDelete,
        closePopup,
        // openUploadWindow,
        isSubmitButton,
        isViewOnly,
        previewFile,
        previewIndex,
        // fileNames,
        setPreviewIndex,
        getFilesForPreview,
        // uppy
        handleUploadPopup,
        generateURLAndSubmit,
        isMulti,
        acceptedFormats,
        filesizeAllowed,
        isDownloadable
    } = props;

    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };
    const goToPrevPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
    };

    const goToNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, numPages));
    };

    const uppyRef = useRef(null);

    const [imageRotateAngle, setImageRotateAngle] = useState(0);
    const [imgScale, setImageScale] = useState(1);
    const styles = {
        mainStyle: {
            position: "fixed",
            width: "100%",
            height: "100%",
            backgroundColor: "#00000085",
            top: "0",
            left: "0",
            zIndex: "1300",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
        },
    };

    const submitFiles = () => {
        submitData();
    };

    const onChipSelected = (event, id) => {
        event.preventDefault();
        for (let index = 0; index < previewFile.length; index++) {
            if (index === id) {
                setPreviewIndex(id);
            }
        }
    };

    const handleDelete = (file, id) => {
        if (!isViewOnly) {
            onDelete(file);
            uppyRef.current?.deleteFile(file);
            setPreviewIndex(id - 1 > 0 ? id - 1 : 0);
        }
    };

    // download the active file
    const downloadCurrentFile = () => {
        const link = document.createElement("a");
        link.href = previewFile[previewIndex]?.url;
        link.download = previewFile[previewIndex]?.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    //  rotate method
    const rotateImage = (side, id) => {
        if (side === "right") {
            const angle = imageRotateAngle + 90;
            document.getElementById("image_container").style.transform = `rotate(${angle}deg)`;
            setImageRotateAngle(angle);
        } else if (side === "left") {
            const angle = imageRotateAngle - 90;
            document.getElementById("image_container").style.transform = `rotate(${angle}deg)`;
            setImageRotateAngle(angle);
        }
        setTimeout(() => {
            document.getElementById(id).focus();
        }, 400);
    };

    const zoomin = () => {
        const myImg = document.getElementById("image_container");
        const newScale = imgScale !== 0 ? imgScale + 0.25 : 1;
        myImg.style.transform = `scale(${newScale})`;
        myImg.style.transition = "transform 0.25s ease";
        setImageScale(newScale);
        setTimeout(() => {
            document.getElementById("upload-component-zoomin-btn").focus();
        }, 400);
        return null;
    };

    const zoomout = () => {
        const myImg = document.getElementById("image_container");
        const newScale = imgScale !== 0 ? imgScale - 0.25 : 1;
        myImg.style.transform = `scale(${newScale})`;
        myImg.style.transition = "transform 0.25s ease";
        setImageScale(newScale);
        setTimeout(() => {
            document.getElementById("upload-component-zoomout-btn").focus();
        }, 400);
        return null;
    };

    useEffect(() => {
        getFilesForPreview(data);
    }, [data]);

    const separatedFormats = acceptedFormats > 1 ? acceptedFormats?.join(", ") : acceptedFormats;
    const file = previewFile[previewIndex];
    const extension = String(file?.extension).toLowerCase();

    return (
        <Portal id="portal-container">
            <div style={styles.mainStyle}>
                <div className="uploadPopupMainBox" style={{ height: `${SCREEN_HEIGHT - 150}px`, width: "90%" }}>
                    <div className="border-bottom">
                        <div className="row ">
                            {!isViewOnly && (
                                <div className="col-10 ">
                                    <div className="p-2">
                                        {separatedFormats && <span style={{ fontStyle: "italic", color: "red", fontSize: 11 }}>Allowed file type : ({separatedFormats})</span>}
                                        {filesizeAllowed && (
                                            <span
                                                style={{
                                                    fontStyle: "italic",
                                                    color: "red",
                                                    fontSize: 11,
                                                    marginLeft: "8px",
                                                }}
                                            >
                                                Max. allowed file size : {filesizeAllowed} kb
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="text-end col">
                                <span>
                                    <ActionButton className="me-2" action="CLOSEICON" id="upload-component-close-btn" onClick={closePopup} />
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className={window.innerWidth > 768 ? "d-flex flex-row" : "d-flex flex-column"} style={{ width: "100%", height: "85%" }}>
                        <div className="fileNameRow-container " style={{ width: SCREEN_WIDTH > 768 ? "15%" : "100%", maxHeight: "100%" }}>
                            <Chip label={<span className="upload-chip-label">{`File Count: ${previewFile?.length}`}</span>} />
                            {previewFile?.length > 0 ? (
                                <Paper
                                    sx={
                                        window.innerWidth > 768
                                            ? {
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "flex-start",
                                                flexWrap: "nowrap",
                                                listStyle: "none",
                                                overflow: "auto",
                                                boxShadow: "0 0 4px #0002",
                                                p: 0.5,
                                                m: 0,
                                                maxHeight: "95%",
                                            }
                                            : {
                                                display: "flex",
                                                flexDirection: "row",
                                                maxWidth: "100%",
                                                overflow: "auto",
                                                width: "100%",
                                            }
                                    }
                                    component="ul"
                                >
                                    {previewFile?.map((el, index) => (
                                        <ListItem key={index} className="list-item-upload-chips uplaod-image-thumbnail-container">
                                            <div className={`uplaod-image-thumbnail card ${previewIndex === index && "thumbnail-selected"}`}>
                                                {el?.extension === "pdf" ? (
                                                    <i className="far fa-file-pdf text-center my-auto" style={{ fontSize: "5rem" }} />
                                                ) : el?.extension === "docx" ? (
                                                    <i className="far fa-file-word text-center my-auto" style={{ fontSize: "5rem" }} />
                                                ) : el?.extension === "xlsx" ? (
                                                    <i className="far fa-file-excel text-center my-auto" style={{ fontSize: "5rem" }} />
                                                ) : (
                                                    <img src={el?.url} alt={el?.fileName} width="100%" />
                                                )}
                                                <div
                                                    className="uplaod-image-thumbnail-overlay"
                                                    onClick={(e) => onChipSelected(e, index)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => ERPUtils.isKeyBoardEnterPressed(e) && onChipSelected(e, index)}
                                                >
                                                    {!isViewOnly && (
                                                        <span className="uplaod-image-thumbnail-delete-icon">
                                                            <ActionButton action="DELETEICON" title="Remove File" onClick={() => handleDelete(el, index)} />
                                                        </span>
                                                    )}
                                                    <span className="uplaod-image-thumbnail-preview-icon">
                                                        <ExpandOutlined onClick={(e) => onChipSelected(e, index)} />
                                                    </span>
                                                    <span className="uplaod-image-thumbnail-image-text">{el?.fileName}</span>
                                                </div>
                                            </div>
                                        </ListItem>
                                    ))}
                                </Paper>
                            ) : null}
                        </div>

                        <div className="p-2" style={{ height: "100%", overflow: "hidden", width: "100%" }}>
                            <label className="position-relative upload-chip-label-2" style={{ top: "0px", left: "0px" }}>
                                {file?.fileName}
                            </label>
                            <div className="upload-imagePreview-parent">
                                {ERPUtils.isNullorWhiteSpace(file) ? (
                                    <div className="upload-component-preview-image">
                                        <Empty />
                                    </div>
                                ) : String(extension).toLowerCase() === "docx" || String(extension).toLowerCase() === "xlsx" || String(extension).toLowerCase() === "pdf" ? (
                                    <div className="image-container-parent">
                                        {String(extension).toLowerCase() === "pdf" ? (
                                            <div className="pdf-viewer-container" style={{ marginTop: "10px", textAlign: "center" }}>
                                                <PDFViewer fileUrl={file?.url} currentPage={currentPage} setCurrentPage={setCurrentPage} file={file} downloadCurrentFile={downloadCurrentFile} numPages={numPages} setNumPages={setNumPages}
                                                    onDocumentLoadSuccess={onDocumentLoadSuccess} />
                                            </div>
                                        ) : (
                                            <Empty
                                                image={
                                                    extension === "docx" ? (
                                                        <i className="far fa-file-word" style={{ fontSize: "5rem" }} />
                                                    ) : extension === "pdf" ? (
                                                        <i className="far fa-file-pdf" style={{ fontSize: "5rem" }} />
                                                    ) : (
                                                        <i className="far fa-file-excel" style={{ fontSize: "5rem" }} />
                                                    )
                                                }
                                                style={{ height: 100, padding: "8px", marginTop: "10px" }}
                                                description={
                                                    <span>
                                                        <b>{file?.fileName}</b>
                                                        <br />( Preview not available .)
                                                        {isDownloadable && (
                                                            <p>
                                                                Click here to{" "}
                                                                <span
                                                                    className="link-primary cursor-pointer"
                                                                    onClick={downloadCurrentFile}
                                                                    role="link"
                                                                    tabIndex={0}
                                                                    onKeyDown={(e) => ERPUtils.isKeyBoardEnterPressed(e) && downloadCurrentFile}
                                                                >
                                                                    download
                                                                </span>{" "}
                                                                and view the file{" "}
                                                            </p>
                                                        )}
                                                    </span>
                                                }
                                            />
                                        )}
                                    </div>
                                ) : ["jpg", "jpeg", "png", "svg"].includes(extension) ? (
                                    <div className="image-container-parent container" id="image-drag-container">
                                        <img src={file?.url} draggable id="image_container" alt={file?.fileName} />
                                    </div>
                                ) : (
                                    <div className="upload-component-preview-image">
                                        <Empty
                                            image={<i className="fas fa-file-alt" style={{ fontSize: "5rem" }} />}
                                            imageStyle={{ height: 100 }}
                                            description={
                                                <span>
                                                    <b>{file?.fileName}</b>
                                                    <br />( Preview not available .)
                                                </span>
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-2 py-1 d-flex justify-content-between align-items-enter border" style={{ height: "100px", backgroundColor: "#fff" }}>
                        <div className="text-center">
                            {!isViewOnly && (
                                <UppyUploader
                                    id="UPPY_UPLOAD_ESPro_Upload"
                                    handleUploadPopup={handleUploadPopup}
                                    previewFile={previewFile}
                                    generateURLAndSubmit={generateURLAndSubmit}
                                    isMulti={isMulti}
                                    acceptedFormats={acceptedFormats}
                                    filesizeAllowed={filesizeAllowed}
                                    data={data}
                                    ref={uppyRef}
                                    overalFileSizerestriction={props?.overalFileSizerestriction}
                                />
                            )}
                        </div>
                        {!ERPUtils.isNullOrEmpty(previewFile) && (
                            <div className="d-flex justify-content-between align-items-center">
                                {extension === "pdf" && numPages > 1 && (
                                    <div >
                                        <ActionButton action="LEFTINVERTEDICON" onClick={goToPrevPage} disabled={currentPage === 1}></ActionButton>
                                        <span style={{ margin: "2px .5rem" }}>
                                            Page {currentPage} of {numPages}
                                        </span>
                                        <ActionButton action="RIGHTINVERTEDICON" onClick={goToNextPage} disabled={currentPage === numPages}></ActionButton>

                                    </div>
                                )}
                                {["jpg", "jpeg", "png", "svg"].includes(extension) && window.innerWidth > 768 && (
                                    <>
                                        <ActionButton
                                            action="ROTATELEFTICON"
                                            className="mr-2"
                                            onClick={() => rotateImage("left", "upload-component-rotateleft-btn")}
                                            id="upload-component-rotateleft-btn"
                                        />
                                        <ActionButton action="ZOOMOUTICON" className="mr-2 " onClick={zoomout} title="zoom out image" id="upload-component-zoomout-btn" />
                                        <ActionButton className="mr-2" action="ZOOMINICON" title="zoom in image" role="button" onClick={zoomin} id="upload-component-zoomin-btn" />
                                        <ActionButton
                                            action="ROTATERIGHTICON"
                                            onClick={() => rotateImage("right", "upload-component-rotateright-btn")}
                                            id="upload-component-rotateright-btn"
                                        />
                                    </>
                                )}
                                {isDownloadable && (
                                    <ActionButton
                                        action={window.innerWidth > 768 ? "DOWNLOAD" : "DOWNLOADICON"}
                                        className=" mr-2"
                                        value="Download File"
                                        onClick={downloadCurrentFile}
                                        title="download current file"
                                        id="upload-component-download-btn"
                                    />
                                )
                                }
                            </div>
                        )}

                        <div className="d-flex align-items-center">
                            {isSubmitButton ? <ActionButton value="Submit" action="SUBMIT" className="mr-2" onClick={submitFiles} /> : null}
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
}