
import FileUploadSharpIcon from "@mui/icons-material/FileUploadSharp";
import { Button } from "@mui/material";
import axios from "axios";
import {
    Component
} from "react";
import ActionButton from "./ActionButton";
import ApiGateway from "./ApiGateway";
import AppContext from "./AppContext";
import ERPUtils from "./ERPUtils";
import "./UploadComponent.css";
import UploadViewPopup from "./UploadViewPopup";

export default class UploadFile extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isMulti: props?.isMulti || true,
            data: [],
            isView: false,
            popupData: [],
            labelText: "Upload & View",
            isSubmitButton: false,
            uploadOpen: false,
            initialFiles: [props?.data],
            previewFile: [],
            previewIndex: 0,
            // fileNames: [],
            isDownloadable: props.isDownloadable ?? true
        };

    }


    handleUploadPopup = () => {
        this.setState((prevState) => ({ uploadOpen: !prevState.uploadOpen }));
    };

    getKeyPathFromList = (list) => {
        const key = this.props?.id;
        for (let index = 0; index < list?.length; index++) {
            if (list[index]?.uploadProcessCode === key) {
                return {
                    tempPath: list[index]?.tempFolderPath,
                    actualPath: list[index]?.folderPath,
                    folderListId: list[index]?.folderListId,
                    fileSizeInKB: list[index]?.fileSizeInKB,
                    fileTypeList: list[index]?.fileTypeList,
                    uploadProcessCode: list[index]?.uploadProcessCode,
                };
            }
        }
        return null;
    };

    callBackForLatestState = () => ({
        data: this.state.data,
        popupData: this.state.popupData,
    });

    updateAllStates = (array, finalDataArray) => {
        this.setState({
            // fileNames: array,
            previewFile: finalDataArray.length !== 0 ? finalDataArray : [],
        });
        document.getElementById("upload-component-close-btn")?.focus();
    };

    getFilesForPreview = async (datas) => {
        const finalDataArray = [];
        const array = [];
        const previewUrlsList = [];
        const previewListLenght = [];
        if (!ERPUtils.isUndefinedOrNull(datas) && !ERPUtils.isNullOrEmpty(datas)) {
            for (let index = 0; index < datas?.length; index++) {
                if (typeof datas[index] === "object") {
                    if (!ERPUtils.isNullorWhiteSpace(datas[index]?.file)) {
                        array.push(datas[index]?.name);
                        finalDataArray.push({
                            url: URL.createObjectURL(datas[index].file),
                            fileName: datas[index]?.name,
                            extension: datas[index]?.extension || "",
                        });
                        previewListLenght.push("0");
                    } else if (ERPUtils.isNullorWhiteSpace(datas[index]?.preSignedUrl)
                        && (!ERPUtils.isNullorWhiteSpace(datas[index]?.actualPath))) {
                        const obj = {
                            originalFileName: "",
                            uniqueFileName: "",
                            tempPath: "",
                            actualPath: "",
                            preSignedUrl: "",
                            processCode: this.props?.id,
                        };
                        obj.originalFileName = datas[index]?.originalFileName;
                        obj.actualPath = datas[index]?.actualPath;
                        previewUrlsList.push(obj);
                    } else {
                        array.push(datas[index]?.originalFileName);
                        const spittedArray = datas[index]?.originalFileName?.split(".") || [];
                        finalDataArray.push({
                            url: URL?.createObjectURL(datas[index]?.preSignedUrl),
                            fileName: datas[index]?.originalFileName,
                            extension: spittedArray[spittedArray.length - 1] || "",
                        });
                        previewListLenght.push("0");
                    }
                }
            }
        }
        if (previewUrlsList.length !== 0) {
            ERPUtils.loading(this.props.tabId, true);
            await ApiGateway.post("fileUploadDownLoad/download/presigned", previewUrlsList, async (response) => {
                const responseObj = ERPUtils.checkResponse(response, true, "Get");
                if (!ERPUtils.isNullorWhiteSpace(responseObj)) {
                    for (let index = 0; index < responseObj.length; index++) {
                        const spittedArray = responseObj[index]?.originalFileName?.split(".") || [];
                        const newObj = {
                            url: responseObj[index]?.preSignedUrl,
                            fileName: responseObj[index]?.originalFileName,
                            extension: spittedArray[spittedArray.length - 1] || "",
                        };
                        finalDataArray.push(newObj);
                        previewListLenght.push("0");
                        array.push(responseObj[index]?.originalFileName);
                    }
                    if (previewListLenght.length === datas?.length) {
                        await this.updateAllStates(array, finalDataArray);
                    }
                } else {
                    AppContext.notify({ Type: "danger", Text: "Sorry, Uploading Failed" });
                }
                ERPUtils.loading(this.props.tabId, false);
            }, "Protected");
        } else if (previewListLenght.length === datas?.length) {
            await this.updateAllStates(array, finalDataArray);
            await ERPUtils.loading(this.props.tabId, false);
        }
    };

    generateURLAndSubmit = async (files) => {
        let fileValue = !ERPUtils.isNullorWhiteSpace(this.state.popupData) && ERPUtils.isArray(this.state.popupData) ? ERPUtils.cloneState(this.state.popupData) : [];
        const dataList = !ERPUtils.isNullorWhiteSpace(this.state.data) && ERPUtils.isArray(this.state.data) ? ERPUtils.cloneState(this.state.data) : [];
        if (this.state.isMulti) {
            await files.forEach((file) => {
                fileValue.push(file);
                return fileValue;
            });
        } else {
            fileValue = files;
        }
        const UploadFileArray = [];
        const fileNameArray = [];
        let isFileForSaving = false;
        const pathKey = this.getKeyPathFromList(this.props?.keyList || []);
        const processCode = this.getKeyPathFromList(this.props?.keyList || []);
        if (!ERPUtils.isNullorWhiteSpace(pathKey)) {
            for (let index = 0; index < fileValue.length; index++) {
                if (typeof fileValue[index] === "object" && !ERPUtils.isNullorWhiteSpace(fileValue[index]?.data)) {
                    const presignedURLObj = {
                        originalFileName: `${fileValue[index]?.name}`,
                        tempPath: null,
                        actualPath: null,
                        preSignedUrl: "",
                        processCode: processCode?.uploadProcessCode,
                        uniqueFileName: "",
                        id: "",
                    };
                    UploadFileArray.push(presignedURLObj);
                    const fileNameObj = {
                        file: fileValue[index]?.data, name: `${fileValue[index]?.name}`,
                    };
                    fileNameArray.push(fileNameObj);
                    isFileForSaving = true;
                }
            }
            if (isFileForSaving) {
                ERPUtils.loading(this.props.tabId, true);
                await ApiGateway.post("fileUploadDownLoad/upload/presigned", UploadFileArray, async (response) => {
                    const responseObj = ERPUtils.checkResponse(response, true, "Get");
                    if (!ERPUtils.isNullorWhiteSpace(responseObj)) {
                        const isSavingDone = [];
                        for (let index = 0; index < responseObj.length; index++) {
                            for (let fileIndex = 0; fileIndex < fileNameArray.length; fileIndex++) {
                                if (fileNameArray[fileIndex].name === responseObj[index].originalFileName) {
                                    const myNewFile = new File([fileNameArray[fileIndex].file], responseObj[index]?.uniqueFileName, { type: fileNameArray[fileIndex].file.type });
                                    await axios.put(responseObj[index].preSignedUrl, myNewFile, {
                                        headers: {
                                            "Content-type": "multipart/form-data",
                                        },
                                    }).then((res) => {
                                        const filePath = `${responseObj[index]?.tempPath}${responseObj[index]?.uniqueFileName}`;
                                        const keyObj = this.getKeyPathFromList(this.props?.keyList || []);
                                        const obj = {
                                            originalFileName: responseObj[index]?.originalFileName,
                                            uniqueFileName: responseObj[index]?.uniqueFileName,
                                            tempPath: null,
                                            newFile: true,
                                            id: "",
                                            processCode: processCode?.uploadProcessCode,
                                            actualPath: null,
                                            preSignedUrl: fileNameArray[fileIndex].file,
                                            folderListId: !ERPUtils.isNullorWhiteSpace(keyObj) ? keyObj?.folderListId : "",
                                        };

                                        if (ERPUtils.isArray(fileValue)) {
                                            if (this.props?.isMulti === false) {
                                                dataList.splice(0, dataList.length);
                                            }
                                            dataList.push(obj);
                                            isSavingDone.push(filePath);
                                        }
                                    })
                                        .catch((err) => {
                                            AppContext.notify({ Type: "danger", Text: `Uploading ${fileNameArray[fileIndex].file?.name || "a"} file failed` });
                                        });
                                }
                            }
                        }
                        if (isSavingDone.length === UploadFileArray.length) {
                            this.setState({
                                data: dataList, popupData: dataList, uploadOpen: false, isView: true,
                            });
                        }
                    } else {
                        AppContext.notify({ Type: "danger", Text: "Sorry, Uploading Failed" });
                    }
                    ERPUtils.loading(this.props.tabId, false);
                }, "Protected");
            } else {
                this.setState({ data: dataList, popupData: dataList });
            }
        } else {
            AppContext.notify({ Type: "danger", Text: "Sorry, Uploading Failed" });
            ERPUtils.loading(this.props.tabId, false);
        }
        this.setState({ isSubmitButton: true });
    };

    openUploadWindow = () => {
        this.setState({ uploadOpen: true });
    };

    showPreviewPopup = (datas) => {
        if (datas?.length > 0) {
            this.setState({ isView: true });
        } else if (datas?.length === 0 && this.props?.isViewOnly) {
            this.setState({ isView: false });
            AppContext.notify({ Type: "warning", Text: "No file available" });
        } else {
            this.setState({ isView: false });
            this.openUploadWindow();
        }
    };

    initialiseData = (initData) => {
        if (!ERPUtils.isUndefinedOrNull(initData) || !ERPUtils.isUndefinedOrNull(this.props?.data)) {
            const newData = ERPUtils.isUndefinedOrNull(initData) ? this.props?.data : initData;
            if (Array.isArray(newData) || this.props?.isMulti) {
                const tempArray = [];
                const InitialData = newData;
                if (!ERPUtils.isUndefinedOrNull(InitialData)) {
                    InitialData?.forEach((docItem) => {
                        if (!ERPUtils.isUndefinedOrNull(docItem?.document)) {
                            tempArray.push(docItem?.document);
                        }
                    });
                }
                this.setState({ data: tempArray, popupData: tempArray, initialFiles: InitialData });
            } else {
                const tempArray = [newData];
                this.setState({ data: tempArray, popupData: tempArray });
            }
        } else {
            this.setState({
                data: [], popupData: [], initialFiles: [], previewFile: [],
            });
        }
        if (!ERPUtils.isNullorWhiteSpace(this.props?.label)) {
            this.setState({ labelText: this.props.label });
        }
        this.setState({ isMulti: this.props?.isMulti });
    };

    closePopup = () => {
        const reset = () => {
            this.setState({ uploadOpen: false, isView: false, isSubmitButton: false });
            this.initialiseData();
        };
        if (this.state.isSubmitButton) {
            AppContext.alert({
                Title: "WARNING",
                Text: "You have unsaved file changes. Closing without submission will result in discarding of the changes. Do you wish to proceed ?",
                Buttons: ["Yes", "No"],
                Callback: (button) => {
                    if (button === 0) {
                        reset();
                    }
                },
            });
        } else {
            reset();
        }
    };

    submitData = (dataList, isFromDelete) => {
        const dataArray = ERPUtils.isUndefinedOrNull(dataList) ? this.state.popupData : dataList;
        if (this.state.isMulti === true) {
            const newArray = [];
            const init = ERPUtils.cloneState(this.state.initialFiles);
            for (let index = 0; index < dataArray.length; index++) {
                const element = dataArray[index];
                const tempArray = init?.filter((initItem) => initItem?.document?.originalFileName === element?.originalFileName);
                if (tempArray?.length > 0) {
                    const newObj = tempArray[0];
                    newObj.document = element;
                    newArray.push(newObj);
                } else {
                    newArray.push({ id: "", documentId: "", document: element });
                }
            }
            this.props.callback(newArray, isFromDelete);
        } else {
            this.props.callback(dataArray[0], isFromDelete);
        }
        if (!isFromDelete) {
            this.setState({ isSubmitButton: false, uploadOpen: false, isView: false });
        }
    };

    deleteFileMethod = (removed) => {
        const dataArray = ERPUtils.cloneState(this.state.popupData);
        const newState = ERPUtils.cloneState(this.state.previewFile);
        const findInd = dataArray.findIndex((item) => item?.originalFileName === removed?.fileName);
        const findinPreview = newState.findIndex((item) => item?.fileName === removed?.fileName);

        if (findInd > -1) dataArray.splice(findInd, 1);
        if (findinPreview > -1) newState.splice(findinPreview, 1);

        const newData = ERPUtils.cloneState(dataArray);
        this.setState({ popupData: newData, data: newData, isSubmitButton: true });
        this.updateAllStates(null, newState);
    };

    componentDidMount() {
        this.initialiseData();
    }

    componentDidUpdate(prevProps) {
        if (prevProps?.data !== this.props?.data) {
            this.initialiseData();
        }
    }

    render() {
        return (
            <span className="" style={{ color: "var(--uploadComponentColor)" }}>
                <span className=" font-weight-bold mr-2">
                    {(this.state.uploadOpen === true || this.state.isView)
                        && (
                            <UploadViewPopup
                                data={this.state.popupData}
                                closePopup={this.closePopup}
                                onDelete={this.deleteFileMethod}
                                openUploadWindow={this.openUploadWindow}
                                submitData={this.submitData}
                                isSubmitButton={this.state.isSubmitButton}
                                isViewOnly={this.props?.isViewOnly}
                                // Handlers
                                getFilesForPreview={this.getFilesForPreview}
                                setPreviewIndex={(value) => this.setState({ previewIndex: value })}
                                previewFile={this.state.previewFile}
                                // fileNames={fileNames}
                                previewIndex={this.state.previewIndex}
                                handleUploadPopup={this.handleUploadPopup}
                                generateURLAndSubmit={this.generateURLAndSubmit}
                                isMulti={this.state.isMulti}
                                acceptedFormats={this.getKeyPathFromList(this.props.keyList)?.fileTypeList || ""}
                                filesizeAllowed={this.getKeyPathFromList(this.props.keyList)?.fileSizeInKB || ""}
                                callBackForLatestState={this.callBackForLatestState}
                                overalFileSizerestriction={this.props?.overalFileSizerestriction}
                                isDownloadable={this.state.isDownloadable}
                            />
                        )}

                    <label className="uploadLabel">
                        {this.props?.isViewOnly === true || this.props?.isViewOnly === "true" ? (
                            <ActionButton action="FILEPREVIEWICON" onClick={() => this.showPreviewPopup(this.state.data, true)} />
                        )
                            : this.props?.isIconButton === true ? (
                                <span
                                    style={{ color: "var(--uploadComponentColor)" }}
                                    role="button"
                                    onKeyDown={() => this.showPreviewPopup(this.state.data, true)}
                                    tabIndex={0}
                                    onClick={() => this.showPreviewPopup(this.state.data, true)}
                                >
                                    {this.state.data?.length > 0 ? <ActionButton action="FILEPREVIEWICON" onClick={() => this.showPreviewPopup(this.state.data, true)} /> : <FileUploadSharpIcon />}
                                    {this.props?.isIconOnly === true || this.props?.isIconOnly === true ? null : this.state.data?.length > 0 ? " View File" : "Upload File"}
                                    {/* {this.state.data?.length > 0 ? " View File" : "Upload File"} */}
                                </span>
                            )
                                : (
                                    <Button
                                        variant="outlined"
                                        color={this.props?.color || "primary"}
                                        startIcon={<FileUploadSharpIcon />}
                                        onClick={() => this.showPreviewPopup(this.state.data, true)}
                                        disabled={this.props.disabled}
                                    >
                                        {this.state.labelText}
                                        &nbsp;
                                        {this.state.data?.length > 0 ? `(${this.state.data?.length})` : ""}
                                    </Button>
                                )}
                    </label>
                    {" "}
                </span>
                {/* {isView
        ? (
          <UploadViewPopup
            data={popupData}
            closePopup={closePopup}
            onDelete={deleteFileMethod}
            openUploadWindow={openUploadWindow}
            submitData={submitData}
            isSubmitButton={isSubmitButton}
            isViewOnly={props?.isViewOnly}
            // Handlers
            getFilesForPreview={getFilesForPreview}
            setPreviewIndex={setPreviewIndex}
            previewFile={previewFile}
            fileNames={fileNames}
            previewIndex={previewIndex}
            // For uppy
            handleUploadPopup={handleUploadPopup}
            // previewFile={previewFile}
            generateURLAndSubmit={generateURLAndSubmit}
            isMulti={isMulti}
            acceptedFormats={getKeyPathFromList(props.keyList)?.fileTypeList || ""}
            filesizeAllowed={getKeyPathFromList(props.keyList)?.fileSizeInKB || ""}
          />
        )
        : null} */}
            </span>
        );
    }
}
