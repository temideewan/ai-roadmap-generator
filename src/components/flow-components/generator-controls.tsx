"use client";
import {
  changeRoadmapVisibility,
  checkIfTitleInUsersRoadmaps,
  deleteRoadmapById,
  isRoadmapGeneratedByUser,
} from "@/actions/roadmaps";
import { userHasCredits } from "@/actions/users";
import ApiKeyDialog from "@/components/ApiKeyDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Visibility } from "@prisma/client";
import { UseMutateFunction } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { PresetShare } from "../../app/roadmap/components/preset-share";
import { useUIStore } from "../../app/stores/useUI";
import GenerateButton from "./generate-button";
import ModelSelect from "./model-select";

interface Props {
  title?: string;
  roadmapId: string;
  isPending: boolean;
  renderFlow: string;
  dbRoadmapId: string;
  visibility?: Visibility;
  mutate: UseMutateFunction<any, AxiosError<unknown, any>, any, unknown>;
}

export const GeneratorControls = (props: Props) => {
  const {
    title,
    mutate,
    roadmapId,
    isPending,
    renderFlow,
    dbRoadmapId,
    visibility: initialVisibility,
  } = props;
  const [visibility, setVisibility] = useState(initialVisibility); // Manage visibility state
  const router = useRouter();

  const { model, query, setModelApiKey, setQuery, modelApiKey } = useUIStore(
    useShallow((state) => ({
      model: state.model,
      query: state.query,
      modelApiKey: state.modelApiKey,
      setModelApiKey: state.setModelApiKey,
      setQuery: state.setQuery,
    }))
  );

  useEffect(() => {
    const modelApiKey = localStorage.getItem(`${model.toUpperCase()}_API_KEY`);
    setModelApiKey(modelApiKey);
  }, [model]);

  const onSubmit = async (
    e:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | React.FormEvent<HTMLFormElement>
      | React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    try {
      if (!query) {
        return toast.error("Please enter a query", {
          description: "We need a query to generate a roadmap.",
          duration: 4000,
        });
      }

      const userCredits = await userHasCredits();
      if (!userCredits && modelApiKey === "") {
        return toast.error("You don't have enough credits", {
          description: "To continue please enter your own api key.",
          duration: 4000,
        });
      }
      console.log("title", title);
      const titleExists = await checkIfTitleInUsersRoadmaps(title as string);

      if (titleExists.state) {
        return toast.info("Roadmap already exists", {
          description: "The keyword you entered already exists.",
          duration: 4000,
          position: "top-center",
          action: {
            label: "View",
            onClick: () => {
              router.push(`/roadmap/${titleExists.id}`);
            },
          },
        });
      }

      toast.info("Generating roadmap", {
        description: "We are generating a roadmap for you.",
        duration: 4000,
      });

      // [TODO] : Check if title query is present in db if yes return data from db
      mutate(
        {
          body: { query },
        },
        {
          onSuccess: () => {
            toast.success("Success", {
              description: "Roadmap generated successfully.",
              duration: 4000,
            });
          },
          onError: (error: any) => {
            toast.error("Something went wrong", {
              description:
                error.response?.data?.message || "Unknown error occurred",
              duration: 4000,
            });
          },
        }
      );
    } catch (e: any) {
      console.error("api error", e);
    }
  };

  const onValueChange = async (value: Visibility) => {
    await changeRoadmapVisibility(dbRoadmapId, value);
    setVisibility(value); // Update visibility state
  };

  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (dbRoadmapId !== undefined) {
        const visibility = await isRoadmapGeneratedByUser(dbRoadmapId);
        setShowVisibilityDropdown(visibility);
      }
    };

    fetchData();
  }, [roadmapId]);

  useEffect(() => {
    if (roadmapId) {
      router.push(`/roadmap/${roadmapId}`);
    }
  }, [roadmapId]);

  // Utility function to format visibility
  const formatVisibility = (visibility?: Visibility) => {
    switch (visibility) {
      case Visibility.PUBLIC:
        return "Public";
      case Visibility.PRIVATE:
        return "Private";
      default:
        return "Loading";
    }
  };

  const handleDelete = async () => {
    const response = await deleteRoadmapById(dbRoadmapId);
    // @ts-ignore
    if (response.status === "success") {
      toast.success("Deleted", {
        description: "Roadmap deleted successfully ",
        duration: 4000,
      });
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.error("Error", {
        // @ts-ignore
        description: response.message,
        duration: 4000,
      });
    }
  };

  return (
    <div className="container flex flex-col items-start justify-between space-y-2 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16">
      <div className="md:mx-14 flex w-full space-x-2 sm:justify-end">
        {!dbRoadmapId && (
          <Input
            type="text"
            placeholder="e.g. Try searching for Frontend or Backend"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSubmit(e);
              }
            }}
          />
        )}

        {dbRoadmapId && (
          <div className="flex-1 -ml-6 md:ml-0">
            <Link
              href={`/roadmap`}
              className={buttonVariants({
                variant: "link",
              })}
            >
              ← Back to Generator
            </Link>
          </div>
        )}

        {showVisibilityDropdown && (
          <Button
            variant="destructive"
            size="icon"
            className="mx-2 cursor-pointer"
            onClick={handleDelete}
          >
            <Trash className="text-white w-5 h-5 cursor-pointer" />
          </Button>
        )}

        {showVisibilityDropdown && (
          <Select onValueChange={onValueChange} value={visibility}>
            <SelectTrigger className="md:w-[140px] w-fit">
              <SelectValue placeholder={formatVisibility(initialVisibility)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={Visibility.PUBLIC}>Public</SelectItem>
              <SelectItem value={Visibility.PRIVATE}>Private</SelectItem>
            </SelectContent>
          </Select>
        )}

        {!dbRoadmapId && (
          <div className="hidden sm:flex">
            <ModelSelect />
          </div>
        )}

        {!dbRoadmapId && (
          <GenerateButton onClick={onSubmit} disabled={isPending} />
        )}

        {!dbRoadmapId && <ApiKeyDialog />}

        {renderFlow && dbRoadmapId && (
          <div className="flex space-x-2">
            <PresetShare key={renderFlow} />
          </div>
        )}
      </div>
    </div>
  );
};
